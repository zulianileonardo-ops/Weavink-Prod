# Guide de Mise en Réseau des Services Coolify

**Créé**: 5 décembre 2025
**Mis à jour**: 5 décembre 2025
**Objectif**: Comment les services communiquent dans les déploiements Coolify
**Serveur**: 46.224.102.247

---

## Table des Matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Bases du Réseau Docker](#2-bases-du-réseau-docker)
3. [Diagramme d'Architecture](#3-diagramme-darchitecture)
4. [Configuration Coolify - Étape par Étape](#4-configuration-coolify---étape-par-étape)
5. [Connexion des Services au Réseau](#5-connexion-des-services-au-réseau)
6. [Variables d'Environnement](#6-variables-denvironnement)
7. [Comportement au Redémarrage des Services](#7-comportement-au-redémarrage-des-services)
8. [Bonnes Pratiques de Sécurité](#8-bonnes-pratiques-de-sécurité)
9. [Tunnels Cloudflare](#9-tunnels-cloudflare)
10. [Test de Connectivité](#10-test-de-connectivité)
11. [Dépannage](#11-dépannage)
12. [Scripts de Test](#12-scripts-de-test)
13. [Mises à Jour Futures](#13-mises-à-jour-futures)

---

## 1. Vue d'ensemble

Lors du déploiement de plusieurs services (application Weavink, embed-service, rerank-service, Redis, Qdrant) dans Coolify, ils communiquent via le réseau interne de Docker. Ce guide explique comment configurer cela correctement.

### Principes Clés

| Principe | Description |
|----------|-------------|
| **Réseau Interne** | Les services communiquent via un réseau Docker privé |
| **DNS par Nom** | Les conteneurs se découvrent mutuellement par nom de conteneur |
| **Pas d'Exposition Externe** | Les services ML restent internes (pas de ports publics) |
| **Connexion Réseau Manuelle** | Dans Coolify, vous devez connecter manuellement chaque service au réseau partagé |

### Important: Comportement de Coolify

Coolify génère des **noms de conteneurs aléatoires** comme `s40swk408s00s4s4k8kso0gk` au lieu de noms simples comme `redis`. Cela signifie:

1. Vous devez noter le nom du conteneur après le déploiement
2. Vous devez connecter manuellement chaque conteneur à votre réseau partagé
3. Vos variables d'environnement doivent utiliser le nom de conteneur réel (ou l'URL interne fournie par Coolify)

---

## 2. Bases du Réseau Docker

### Comment Ça Fonctionne

Docker crée un réseau virtuel où les conteneurs peuvent communiquer. Chaque conteneur obtient:

1. **IP Interne**: IP privée (ex: 172.18.0.5) - change au redémarrage
2. **Nom DNS**: Nom du conteneur (ex: `s40swk408s00s4s4k8kso0gk`) - reste constant

Quand votre application appelle `http://s40swk408s00s4s4k8kso0gk:6379`, le DNS interne de Docker résout ce nom vers l'IP du conteneur.

### Types de Réseau

| Type | Cas d'Usage | Notre Choix |
|------|-------------|-------------|
| `bridge` | Par défaut, réseau isolé | Oui |
| `host` | Partage le réseau hôte (pas d'isolation) | Non |
| `overlay` | Multi-hôte (Docker Swarm) | Non |

Nous utilisons un **réseau bridge** (`weavink-internal`) pour l'isolation et la sécurité.

---

## 3. Diagramme d'Architecture

### Noms des Conteneurs et Commandes Réseau

| Service | Nom du Conteneur | Statut | Commande Réseau |
|---------|------------------|--------|-----------------|
| Redis | `s40swk408s00s4s4k8kso0gk` | ✅ Fait | `docker network connect weavink-internal s40swk408s00s4s4k8kso0gk` |
| Qdrant | `qdrant-n8ck4s8oww0o8ckwoc0kgsc0` | ✅ Fait | `docker network connect weavink-internal qdrant-n8ck4s8oww0o8ckwoc0kgsc0` |
| embed-service | `e0g4c0g8wsswskosgo0o00k0-124929708495` | ✅ Fait | `docker network connect weavink-internal e0g4c0g8wsswskosgo0o00k0-124929708495` |
| rerank-service | `gko04o4448o44cwgw4gk080w-133339492322` | ✅ Fait | `docker network connect weavink-internal gko04o4448o44cwgw4gk080w-133339492322` |
| Application Weavink | `<en attente>` | ⏳ En attente | `docker network connect weavink-internal <nom-conteneur>` |

### Diagramme d'Architecture

```mermaid
flowchart TB
    subgraph Internet["🌐 Internet"]
        User["👤 Utilisateur<br/>Navigateur"]
    end

    subgraph CloudflareLayer["🟠 Cloudflare (glidlink.com)"]
        CF["☁️ Cloudflare Edge<br/>Terminaison TLS"]
        Tunnel["🔒 Tunnel Cloudflare<br/>Connexion Chiffrée"]
    end

    subgraph Server["🖥️ Serveur (46.224.102.247)"]
        subgraph Coolify["☁️ Coolify / Traefik"]
            Traefik["🔀 Proxy Traefik<br/>Port 443 (HTTPS)<br/>Certificat Origin"]
        end

        subgraph DockerNetwork["🔒 Réseau Docker: weavink-internal"]
            subgraph WeavinkApp["📦 Application Weavink ⏳"]
                NextJS["⚛️ Next.js<br/>Port 3000<br/><i>Public via Traefik</i>"]
            end

            subgraph MLServices["🤖 Services ML (fastembed 0.5.1)"]
                Embed["📊 embed-service ✅<br/>Port 5555<br/>E5-large (1024D)<br/><i>e0g4c0g8wsswskosgo0o00k0-...</i>"]
                Rerank["🔄 rerank-service ✅<br/>Port 5556<br/>BGE-reranker-base<br/><i>gko04o4448o44cwgw4gk080w-...</i>"]
            end

            subgraph DataStores["💾 Stockages de Données"]
                Redis["🔴 Redis ✅<br/>Port 6379<br/><i>s40swk408s00s4s4k8kso0gk</i>"]
                Qdrant["🔷 Qdrant ✅<br/>Port 6333<br/><i>qdrant-n8ck4s8oww0o8ckwoc0kgsc0</i>"]
            end
        end
    end

    %% Connexions externes (Full TLS)
    User -->|"HTTPS"| CF
    CF -->|"Chiffré"| Tunnel
    Tunnel -->|"HTTPS :443"| Traefik
    Traefik -->|"HTTP :3000"| NextJS

    %% Connexions internes depuis Weavink
    NextJS -->|"POST /embed"| Embed
    NextJS -->|"POST /rerank"| Rerank
    NextJS -->|"redis:// + Mot de passe"| Redis
    NextJS -->|"HTTP + Clé API"| Qdrant

    %% Styles
    classDef internet fill:#e1f5fe,stroke:#01579b
    classDef cloudflare fill:#fff3e0,stroke:#f48120
    classDef proxy fill:#fff3e0,stroke:#e65100
    classDef app fill:#e8f5e9,stroke:#2e7d32
    classDef deployed fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef deploying fill:#bbdefb,stroke:#1976d2,stroke-dasharray: 5 5
    classDef pending fill:#fff9c4,stroke:#f9a825,stroke-dasharray: 5 5
    classDef data fill:#fce4ec,stroke:#c2185b

    class User internet
    class CF,Tunnel cloudflare
    class Traefik proxy
    class NextJS pending
    class Embed deployed
    class Rerank deployed
    class Redis,Qdrant deployed
```

### Matrice de Communication des Services

| De → Vers | Protocole | Port | Auth Requise | Méthode d'Auth |
|-----------|-----------|------|--------------|----------------|
| Internet → Weavink | HTTPS | 443 | Oui | Session utilisateur |
| Weavink → embed-service | HTTP | 5555 | Non | - |
| Weavink → rerank-service | HTTP | 5556 | Non | - |
| Weavink → Redis | redis:// | 6379 | Oui | Mot de passe dans l'URL |
| Weavink → Qdrant | HTTP | 6333 | Oui | En-tête `api-key` |

### Diagramme de Séquence du Flux de Requête

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Utilisateur
    participant T as 🔀 Traefik
    participant W as ⚛️ App Weavink
    participant E as 📊 embed-service
    participant R as 🔄 rerank-service
    participant Q as 🔷 Qdrant
    participant RD as 🔴 Redis

    Note over U,RD: Flux de Recherche Sémantique

    U->>+T: HTTPS :443 (Requête de recherche)
    T->>+W: HTTP :3000

    W->>+RD: Vérifier cache (redis:// :6379 + Mot de passe)
    RD-->>-W: Cache miss

    W->>+E: POST /embed :5555 (Sans Auth)
    Note right of E: Générer embedding de requête<br/>Modèle E5-large
    E-->>-W: Vecteur 1024 dimensions

    W->>+Q: POST /points/search :6333
    Note right of Q: En-tête: api-key: xxx
    Q-->>-W: Top 50 correspondances

    W->>+R: POST /rerank :5556 (Sans Auth)
    Note right of R: Reclasser avec BGE-reranker
    R-->>-W: Résultats reclassés

    W->>+RD: Mettre en cache (TTL: 1h)
    RD-->>-W: OK

    W-->>-T: Réponse JSON
    T-->>-U: Réponse HTTPS

    Note over U,RD: Tout le trafic interne est HTTP (pas HTTPS)
```

### Résumé des Ports et de l'Authentification

```mermaid
flowchart TB
    subgraph External["🌐 EXTERNE (Internet → Coolify)"]
        HTTPS["HTTPS :443<br/>Auth utilisateur via cookies de session"]
    end

    subgraph Internal["🔒 INTERNE (Réseau Docker: weavink-internal)"]
        subgraph NoAuth["Sans Authentification"]
            Embed["📊 embed-service :5555<br/>POST /embed, /embed/batch"]
            Rerank["🔄 rerank-service :5556<br/>POST /rerank"]
        end

        subgraph WithAuth["Avec Authentification"]
            RedisAuth["🔴 Redis :6379<br/>Mot de passe dans l'URL<br/><code>redis://default:PASS@host:6379</code>"]
            QdrantAuth["🔷 Qdrant :6333<br/>En-tête Clé API<br/><code>api-key: &lt;clé&gt;</code>"]
        end
    end

    External --> Internal

    classDef external fill:#e3f2fd,stroke:#1565c0
    classDef noauth fill:#fff3e0,stroke:#ef6c00
    classDef withauth fill:#e8f5e9,stroke:#2e7d32

    class HTTPS external
    class Embed,Rerank noauth
    class RedisAuth,QdrantAuth withauth
```

> **Pourquoi les services ML n'ont pas d'authentification:**
> - Accessibles uniquement dans le réseau Docker
> - Pas d'exposition de port externe
> - Isolation réseau = barrière de sécurité

---

## 4. Configuration Coolify - Étape par Étape

### Étape 1: Créer le Réseau Partagé (Une Seule Fois)

Connectez-vous en SSH à votre serveur et créez le réseau:

```bash
ssh root@46.224.102.247

# Créer le réseau (faire une seule fois)
docker network create weavink-internal
```

### Étape 2: Déployer Redis

Dans le Tableau de Bord Coolify:

1. **Nouvelle Ressource** → **Base de données** → **Redis**
2. **Paramètres**:
   - Image: `redis:7.2`
   - **Ports Mappings**: Laisser vide (interne uniquement!)
   - **Rendre publiquement disponible**: DÉSACTIVÉ
3. **Configuration Redis Personnalisée**:
   ```
   maxmemory 4gb
   maxmemory-policy allkeys-lru
   appendonly yes
   ```
4. **Déployer** et noter le nom du conteneur depuis le champ "Redis URL (internal)"

**Exemple**: Coolify affiche:
```
redis://default:PASSWORD@s40swk408s00s4s4k8kso0gk:6379/0
```
Le nom du conteneur est: `s40swk408s00s4s4k8kso0gk`

### Étape 3: Déployer Qdrant

1. **Nouvelle Ressource** → **Service** → **Qdrant**
2. **Modifier le Fichier Compose**:
   ```yaml
   services:
     qdrant:
       image: 'qdrant/qdrant:latest'
       environment:
         - 'QDRANT__SERVICE__API_KEY=${SERVICE_PASSWORD_QDRANTAPIKEY}'
       volumes:
         - 'qdrant-storage:/qdrant/storage'
       healthcheck:
         test:
           - CMD-SHELL
           - "bash -c ':> /dev/tcp/127.0.0.1/6333' || exit 1"
         interval: 5s
         timeout: 5s
         retries: 3
   ```
3. **Variables d'Environnement**: Garder uniquement `SERVICE_PASSWORD_QDRANTAPIKEY` (supprimer les autres)
4. **Paramètres**:
   - **Ports Mappings**: Laisser vide (interne uniquement!)
   - **Rendre publiquement disponible**: DÉSACTIVÉ
5. **Déployer** et noter le nom du conteneur
6. **Sauvegarder la clé API** - vous en aurez besoin pour `QDRANT_API_KEY` dans l'app Weavink

### Étape 4: Déployer embed-service

1. **Nouvelle Ressource** → **Basé sur Git** → Sélectionner votre repo Weavink
2. **Paramètres**:
   - **Build Pack**: `Dockerfile`
   - **Répertoire de Base**: `/docker/embed-service`
   - **Ports Mappings**: Laisser vide (interne uniquement!)
   - **Rendre publiquement disponible**: DÉSACTIVÉ
3. **Ressources**:
   - Limite CPU: 6
   - Limite Mémoire: 6GB
4. **Déployer** (le premier build prend ~10 min pour télécharger le modèle E5-large)
5. **Connecter au réseau via SSH**:
   ```bash
   # SSH vers le serveur
   ssh root@46.224.102.247

   # Trouver le nom du conteneur
   docker ps | grep embed

   # Connecter au réseau
   docker network connect weavink-internal <nom-conteneur>

   # Vérifier la connexion
   docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'
   ```

### Étape 5: Déployer rerank-service

1. **Nouvelle Ressource** → **Basé sur Git** → Sélectionner votre repo Weavink
2. **Paramètres**:
   - **Build Pack**: `Dockerfile`
   - **Répertoire de Base**: `/docker/rerank-service`
   - **Ports Mappings**: Laisser vide (interne uniquement!)
   - **Rendre publiquement disponible**: DÉSACTIVÉ
3. **Ressources**:
   - Limite CPU: 4
   - Limite Mémoire: 4GB
4. **Déployer** (le premier build prend ~5 min pour télécharger le modèle BGE-reranker)
5. **Connecter au réseau via SSH**:
   ```bash
   # SSH vers le serveur
   ssh root@46.224.102.247

   # Trouver le nom du conteneur
   docker ps | grep rerank

   # Connecter au réseau
   docker network connect weavink-internal <nom-conteneur>

   # Vérifier la connexion
   docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'
   ```

### Important: Version de fastembed

Le rerank-service nécessite `fastembed>=0.4.0` pour le module `fastembed.rerank.cross_encoder`. Les Dockerfiles utilisent `fastembed==0.5.1`.

Si vous rencontrez `ModuleNotFoundError: No module named 'fastembed.rerank'`, le cache Docker utilise peut-être une ancienne version. Le Dockerfile inclut un ARG cache-bust pour forcer les rebuilds.

### Étape 6: Déployer l'Application Weavink

1. **Nouvelle Ressource** → Votre dépôt d'application
2. **Paramètres**:
   - **Rendre publiquement disponible**: ACTIVÉ (c'est votre application publique)
   - Configurer le domaine dans Coolify
3. **Variables d'Environnement**: Voir Section 6
4. **Déployer** et noter le nom du conteneur

---

## 5. Connexion des Services au Réseau

**IMPORTANT**: Après avoir déployé chaque service dans Coolify, vous devez le connecter manuellement au réseau `weavink-internal` via SSH.

### Référence des Commandes SSH

```bash
# SSH vers le serveur
ssh root@46.224.102.247

# Créer le réseau (une seule fois, si inexistant)
docker network create weavink-internal

# Connecter un conteneur au réseau
docker network connect weavink-internal <nom-conteneur>

# Déconnecter un conteneur du réseau
docker network disconnect weavink-internal <nom-conteneur>

# Lister tous les conteneurs sur le réseau
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'

# Détails complets du réseau
docker network inspect weavink-internal
```

### Le Processus (Pour Chaque Service)

#### Étape 1: Trouver le nom du conteneur

```bash
# SSH vers le serveur
ssh root@46.224.102.247

# Lister tous les conteneurs
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Ou trouver des services spécifiques:
docker ps | grep redis
docker ps | grep qdrant
docker ps | grep embed
docker ps | grep rerank
```

Exemple de sortie:
```
NAMES                                    IMAGE                    STATUS
s40swk408s00s4s4k8kso0gk                redis:7.2                Up 5 minutes
qdrant-n8ck4s8oww0o8ckwoc0kgsc0         qdrant/qdrant:v1.12      Up 3 minutes
e0g4c0g8wsswskosgo0o00k0-124929708495   embed-service            Up 2 minutes
```

#### Étape 2: Connecter chaque conteneur au réseau

```bash
# Connecter Redis
docker network connect weavink-internal s40swk408s00s4s4k8kso0gk

# Connecter Qdrant
docker network connect weavink-internal qdrant-n8ck4s8oww0o8ckwoc0kgsc0

# Connecter embed-service
docker network connect weavink-internal e0g4c0g8wsswskosgo0o00k0-124929708495

# Connecter rerank-service (remplacer par le nom réel après déploiement)
docker network connect weavink-internal <nom-conteneur-rerank>

# Connecter l'app Weavink (remplacer par le nom réel après déploiement)
docker network connect weavink-internal <nom-conteneur-weavink>
```

**Note**: Si vous voyez `Error response from daemon: endpoint with name ... already exists in network`, le conteneur est déjà connecté.

#### Étape 3: Vérifier que tous les services sont connectés

```bash
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'
```

Sortie attendue (tout sur une ligne):
```
s40swk408s00s4s4k8kso0gk qdrant-n8ck4s8oww0o8ckwoc0kgsc0 e0g4c0g8wsswskosgo0o00k0-124929708495 <rerank> <weavink>
```

### Script Rapide pour la Connexion Réseau

```bash
#!/bin/bash
# connect-all-services.sh
# Exécuter après avoir déployé tous les services

NETWORK="weavink-internal"

# Obtenir tous les noms de conteneurs (ajuster les patterns grep si nécessaire)
CONTAINERS=$(docker ps --format "{{.Names}}")

for container in $CONTAINERS; do
  echo "Connexion de $container à $NETWORK..."
  docker network connect $NETWORK $container 2>/dev/null || echo "  Déjà connecté ou échec"
done

echo ""
echo "Services sur $NETWORK:"
docker network inspect $NETWORK --format '{{range .Containers}}{{.Name}} {{end}}'
```

---

## 6. Variables d'Environnement

### Pour l'Application Weavink

Coolify fournit des URLs internes avec des noms de conteneurs auto-générés. Utilisez-les dans votre environnement:

```bash
# Redis (utiliser l'URL complète de Coolify)
REDIS_URL=redis://default:o6tlaPpsXCilJ7FgCE4YoIoYHpOM3s7NgTt3Uq0yYosAXkQyW7kXbq8eSghSAkB4@s40swk408s00s4s4k8kso0gk:6379/0

# Qdrant (utiliser le nom du conteneur de docker ps)
QDRANT_URL=http://<nom-conteneur-qdrant>:6333

# Services ML (utiliser les noms de conteneurs de docker ps)
EMBED_SERVICE_URL=http://<nom-conteneur-embed>:5555
RERANK_SERVICE_URL=http://<nom-conteneur-rerank>:5556
```

### Trouver les Noms de Conteneurs

```bash
# Trouver le conteneur Redis
docker ps | grep redis
# Sortie: s40swk408s00s4s4k8kso0gk

# Trouver le conteneur Qdrant
docker ps | grep qdrant
# Sortie: abc123xyz

# Trouver le conteneur embed-service
docker ps | grep embed
# Sortie: def456uvw

# Trouver le conteneur rerank-service
docker ps | grep rerank
# Sortie: ghi789rst
```

### Format d'URL

```
http://s40swk408s00s4s4k8kso0gk:6379
 │      │                      │
 │      │                      └── Port sur lequel le service écoute
 │      └── Nom du conteneur généré par Coolify (DNS)
 └── Protocole (http pour interne, PAS https)
```

**Important**: Utilisez `http://` PAS `https://` pour les services internes. HTTPS est uniquement pour le trafic externe.

---

## 7. Comportement au Redémarrage des Services

### Que Se Passe-t-il Quand un Service Redémarre?

Quand vous redémarrez un service dans Coolify:

1. Le conteneur s'arrête
2. Un nouveau conteneur démarre avec le **même nom** (Coolify préserve le nom)
3. Le DNS Docker se met à jour automatiquement
4. Les connexions reprennent

**Cependant**: Si vous **redéployez** (rebuild), le nom du conteneur peut changer. Vous devrez:
1. Mettre à jour les variables d'environnement avec le nouveau nom de conteneur
2. Reconnecter au réseau `weavink-internal`

### Gestion des Échecs Temporaires

Votre application devrait avoir une logique de retry:

```javascript
// embeddingService.js - gère déjà les échecs
static async _callEmbedServer(text) {
  const response = await fetch(`${EMBED_SERVICE_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Erreur serveur embed: ${response.status}`);
  }

  return (await response.json()).embedding;
}
```

---

## 8. Bonnes Pratiques de Sécurité

### À FAIRE: Garder les Services ML Internes

- **Ports Mappings**: Laisser vide
- **Rendre publiquement disponible**: DÉSACTIVÉ

### À NE PAS FAIRE: Exposer les Services Internes

Ne jamais ajouter de mappings de ports pour:
- Redis (6379)
- Qdrant (6333)
- embed-service (5555)
- rerank-service (5556)

### Configuration du Pare-feu UFW

Le pare-feu du serveur est configuré pour n'autoriser que les ports nécessaires:

```bash
# Statut UFW Actuel (au 5 déc. 2025)
Status: active

To                         Action      From
--                         ------      ----
22                         ALLOW       Anywhere        # SSH
80                         ALLOW       Anywhere        # HTTP
443                        ALLOW       Anywhere        # HTTPS
8000                       ALLOW       Anywhere        # Tableau de bord Coolify
6001:6002/tcp              ALLOW       Anywhere        # Coolify Realtime (WebSocket)
```

### Configuration du Pare-feu UFW

```bash
# Activer UFW avec refus par défaut des entrées
ufw default deny incoming
ufw default allow outgoing

# Autoriser les ports requis
ufw allow 22        # SSH
ufw allow 80        # HTTP
ufw allow 443       # HTTPS
ufw allow 8000      # Tableau de bord Coolify
ufw allow 6001:6002/tcp  # Coolify Realtime

# Activer le pare-feu
ufw --force enable

# Vérifier le statut
ufw status
```

### Optionnel: Restreindre le Tableau de Bord Coolify à Votre IP

```bash
# Trouver d'abord votre IP (exécuter sur votre machine locale)
curl ifconfig.me

# Puis sur le serveur, restreindre le port 8000 à votre IP uniquement
ufw delete allow 8000
ufw allow from VOTRE_IP to any port 8000
```

**Attention**: Ne faites cela que si vous avez une IP statique, sinon vous risquez de vous bloquer l'accès.

### Résultats de l'Audit de Sécurité (5 déc. 2025)

| Vérification | Statut | Détails |
|--------------|--------|---------|
| Ports internes (5555, 5556, 6333, 6379) liés à 0.0.0.0 | ✅ RÉUSSI | Non exposés |
| Mappings de ports Docker | ✅ RÉUSSI | Les services internes n'ont pas de mappings de ports hôte |
| Authentification Redis | ✅ RÉUSSI | Mot de passe requis (`NOAUTH Authentication required`) |
| Accès localhost aux services internes | ✅ RÉUSSI | Tous retournent "NON ACCESSIBLE" |
| Isolation réseau | ✅ RÉUSSI | Les 4 services sur `weavink-internal` |
| Pare-feu UFW | ✅ ACTIF | Seuls les ports 22, 80, 443, 8000, 6001-6002 autorisés |

### Résumé de l'Exposition des Ports

| Port | Service | Lié À | Accessible Depuis Internet |
|------|---------|-------|----------------------------|
| 22 | SSH | 0.0.0.0 | ✅ Oui (autorisé) |
| 80 | HTTP/Traefik | 0.0.0.0 | ✅ Oui (autorisé) |
| 443 | HTTPS/Traefik | 0.0.0.0 | ✅ Oui (autorisé) |
| 8000 | Tableau de bord Coolify | 0.0.0.0 | ✅ Oui (autorisé) |
| 6001-6002 | Coolify Realtime | 0.0.0.0 | ✅ Oui (autorisé) |
| 5555 | embed-service | Interne uniquement | 🔒 Non |
| 5556 | rerank-service | Interne uniquement | 🔒 Non |
| 6333 | Qdrant | Interne uniquement | 🔒 Non |
| 6379 | Redis | Interne uniquement | 🔒 Non |

### Isolation Réseau

Les services sur le réseau `weavink-internal` NE PEUVENT PAS être atteints depuis:
- Internet
- D'autres réseaux Docker
- D'autres projets dans Coolify
- Le localhost de la machine hôte (vérifié)

### Script d'Audit de Sécurité

Exécutez ce script pour vérifier la configuration de sécurité:

```bash
cat > /root/security-audit.sh << 'EOF'
#!/bin/bash
echo "========================================"
echo "  AUDIT DE SÉCURITÉ WEAVINK"
echo "  Serveur: $(hostname)"
echo "  Date: $(date)"
echo "========================================"

echo ""
echo "=== 1. PORTS EN ÉCOUTE ==="
ss -tlnp | grep LISTEN

echo ""
echo "=== 2. MAPPINGS DE PORTS DOCKER ==="
docker ps --format "table {{.Names}}\t{{.Ports}}"

echo ""
echo "=== 3. STATUT DU PARE-FEU ==="
sudo ufw status verbose 2>/dev/null || echo "UFW non installé"

echo ""
echo "=== 4. TEST D'ACCÈS LOCALHOST ==="
echo -n "embed-service (5555): "
curl -s --connect-timeout 2 http://localhost:5555/health 2>/dev/null || echo "NON ACCESSIBLE (bien)"
echo -n "rerank-service (5556): "
curl -s --connect-timeout 2 http://localhost:5556/health 2>/dev/null || echo "NON ACCESSIBLE (bien)"
echo -n "qdrant (6333): "
curl -s --connect-timeout 2 http://localhost:6333/collections 2>/dev/null || echo "NON ACCESSIBLE (bien)"

echo ""
echo "=== 5. MEMBRES DU RÉSEAU ==="
docker network inspect weavink-internal --format '{{range .Containers}}  - {{.Name}}{{"\n"}}{{end}}'

echo ""
echo "=== 6. TEST AUTH REDIS ==="
docker exec s40swk408s00s4s4k8kso0gk redis-cli ping 2>/dev/null || echo "Auth requise (bien)"

echo ""
echo "=== 7. VÉRIFICATION PORTS EXTERNES ==="
ss -tlnp | grep -E ":5555|:5556|:6333|:6379" | grep "0.0.0.0" && echo "ATTENTION!" || echo "OK: Ports internes non exposés"

echo ""
echo "========================================"
EOF
chmod +x /root/security-audit.sh
```

Exécuter avec: `/root/security-audit.sh`

---

## 9. Tunnels Cloudflare

Notre déploiement utilise les **Tunnels Cloudflare** avec **Full TLS** pour exposer les services de manière sécurisée via `glidlink.com` sans exposer l'adresse IP du serveur.

### Qu'est-ce qu'un Tunnel Cloudflare?

Le Tunnel Cloudflare crée une connexion chiffrée entre votre serveur et le réseau edge de Cloudflare. Cela signifie:

| Avantage | Description |
|----------|-------------|
| **IP Serveur Cachée** | L'IP réelle de votre serveur (46.224.102.247) n'est jamais exposée sur internet |
| **Pas de Redirection de Port** | Pas besoin d'ouvrir des ports sur votre routeur/pare-feu pour l'accès public |
| **Protection DDoS** | Le réseau edge de Cloudflare absorbe les attaques avant qu'elles n'atteignent votre serveur |
| **SSL Automatique** | Cloudflare gère l'émission et le renouvellement des certificats |
| **Fonctionne avec IP Dynamique** | Même si l'IP de votre serveur change, le tunnel continue de fonctionner |

### Configuration Actuelle

| Paramètre | Valeur |
|-----------|--------|
| **Domaine** | glidlink.com |
| **Mode TLS** | Full (Strict) - HTTPS de bout en bout |
| **Type de Tunnel** | Conteneur Cloudflared dans Coolify |
| **Certificat Origin** | Wildcard (*.glidlink.com), validité 15 ans |

### Architecture avec Tunnel Cloudflare

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Utilisateur
    participant CF as ☁️ Cloudflare Edge
    participant T as 🔒 Tunnel
    participant TR as 🔀 Traefik
    participant W as ⚛️ App Weavink

    Note over U,W: Full TLS - Chiffré de Bout en Bout

    U->>+CF: HTTPS (glidlink.com)
    Note right of CF: TLS Cloudflare<br/>Protection DDoS
    CF->>+T: Tunnel Chiffré
    Note right of T: Conteneur Cloudflared<br/>Connexion Sortante
    T->>+TR: HTTPS :443
    Note right of TR: Certificat Origin<br/>(*.glidlink.com)
    TR->>+W: HTTP :3000
    W-->>-TR: Réponse
    TR-->>-T: Réponse HTTPS
    T-->>-CF: Chiffré
    CF-->>-U: Réponse HTTPS
```

### Configuration Full TLS (Référence)

Voici comment la configuration Full TLS a été mise en place:

#### Étape 1: Créer le Tunnel Cloudflare

1. Aller sur **Cloudflare Zero Trust** → **Networks** → **Tunnels**
2. Cliquer sur **Create a tunnel** → Sélectionner **Cloudflared**
3. Nommer le tunnel (ex: `glidlink-coolify`)
4. Copier le token du tunnel (commence par `eyJ...`)

#### Étape 2: Créer le Certificat Origin

1. Aller sur **Cloudflare Dashboard** → **SSL/TLS** → **Origin Server**
2. Cliquer sur **Create Certificate**
3. Paramètres:
   - **Type de clé privée**: RSA (2048)
   - **Hostnames**: `*.glidlink.com`, `glidlink.com`
   - **Validité du certificat**: 15 ans
4. Cliquer sur **Create** et télécharger les deux fichiers:
   - Certificat (PEM) → sauvegarder comme `glidlink.cert`
   - Clé privée (PEM) → sauvegarder comme `glidlink.key`

#### Étape 3: Installer le Certificat sur le Serveur

```bash
# SSH vers le serveur
ssh root@46.224.102.247

# Créer le répertoire des certificats
mkdir -p /data/coolify/proxy/certs

# Uploader les fichiers de certificat (depuis votre machine locale)
scp glidlink.cert root@46.224.102.247:/data/coolify/proxy/certs/
scp glidlink.key root@46.224.102.247:/data/coolify/proxy/certs/

# Vérifier les fichiers
ls -la /data/coolify/proxy/certs/
```

#### Étape 4: Configurer Traefik pour TLS

Dans Coolify Dashboard → **Servers** → **Proxy** → **Dynamic Configuration**:

```yaml
tls:
  certificates:
    - certFile: /traefik/certs/glidlink.cert
      keyFile: /traefik/certs/glidlink.key
```

#### Étape 5: Définir le Mode SSL Cloudflare

1. Aller sur **Cloudflare Dashboard** → **SSL/TLS** → **Overview**
2. Sélectionner **Full (strict)**

#### Étape 6: Configurer le Hostname du Tunnel

Dans Cloudflare Zero Trust → Tunnels → Votre Tunnel → **Public Hostname**:

| Champ | Valeur |
|-------|--------|
| **Subdomain** | `*` (wildcard) |
| **Domain** | glidlink.com |
| **Type** | HTTPS |
| **URL** | localhost:443 |

Sous **TLS Settings**:
- **Origin Server Name**: glidlink.com

#### Étape 7: Déployer Cloudflared dans Coolify

1. **New Resource** → Rechercher **Cloudflared**
2. Ajouter la variable d'environnement:
   ```
   TUNNEL_TOKEN=eyJ... (votre token de tunnel)
   ```
3. Déployer

#### Étape 8: Activer Always HTTPS

1. Aller sur **Cloudflare Dashboard** → **SSL/TLS** → **Edge Certificates**
2. Activer **Always Use HTTPS**

### Vérification de la Configuration

```bash
# Vérifier que le tunnel fonctionne
docker ps | grep cloudflared

# Tester HTTPS depuis l'extérieur
curl -I https://glidlink.com

# Vérifier le certificat
openssl s_client -connect glidlink.com:443 -servername glidlink.com 2>/dev/null | openssl x509 -noout -issuer -dates
```

### Quand NE PAS Utiliser les Tunnels Cloudflare

Considérez des alternatives si vous:
- Avez besoin d'un accès direct au serveur sans intermédiaire proxy
- Voulez des certificats SSL d'autorités non-Cloudflare (Let's Encrypt, etc.)
- Préférez ne pas router le trafic via l'infrastructure Cloudflare
- Avez des exigences strictes de résidence des données

### Dépannage des Tunnels Cloudflare

#### Problème: TOO_MANY_REDIRECTS

**Cause**: Désaccord du mode SSL entre Cloudflare et Traefik.

**Solution**: S'assurer que le SSL Cloudflare est sur "Full (strict)" et que le tunnel pointe vers HTTPS:443.

#### Problème: Le tunnel affiche "Unhealthy"

**Cause**: Le conteneur Cloudflared ne fonctionne pas ou le token est invalide.

**Solution**:
```bash
# Vérifier les logs du conteneur
docker logs $(docker ps -q --filter name=cloudflared)

# Vérifier que le token est correct
docker exec $(docker ps -q --filter name=cloudflared) printenv TUNNEL_TOKEN
```

#### Problème: Erreurs de certificat

**Cause**: Certificat origin mal installé ou hostname non correspondant.

**Solution**:
```bash
# Vérifier que les fichiers de certificat existent
ls -la /data/coolify/proxy/certs/

# Vérifier les hostnames du certificat
openssl x509 -in /data/coolify/proxy/certs/glidlink.cert -noout -text | grep DNS
```

---

## 10. Test de Connectivité

### Depuis Votre Serveur (SSH)

```bash
ssh root@46.224.102.247

# Vérifier que tous les services tournent
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Vérifier que le réseau existe et voir les conteneurs connectés
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'

# Tester la connectivité entre conteneurs
# Remplacer <noms-conteneurs> par les noms réels

# Test de Weavink vers embed-service
docker exec <conteneur-weavink> curl -s http://<conteneur-embed>:5555/health

# Test de Weavink vers rerank-service
docker exec <conteneur-weavink> curl -s http://<conteneur-rerank>:5556/health

# Test de Weavink vers Redis
docker exec <conteneur-weavink> redis-cli -h <conteneur-redis> -a <mot-de-passe> ping

# Test de Weavink vers Qdrant
docker exec <conteneur-weavink> curl -s http://<conteneur-qdrant>:6333/collections
```

### Script de Test de Connectivité Rapide

Sauvegardez ceci sur votre serveur:

```bash
#!/bin/bash
# /root/test-connectivity.sh

echo "=== Test de Connectivité des Services Weavink ==="
echo ""

# Obtenir les noms des conteneurs (ajuster à vos noms réels)
WEAVINK=$(docker ps --format "{{.Names}}" | grep -E "weavink|nextjs" | head -1)
REDIS=$(docker ps --format "{{.Names}}" | grep -i redis | head -1)
QDRANT=$(docker ps --format "{{.Names}}" | grep -i qdrant | head -1)
EMBED=$(docker ps --format "{{.Names}}" | grep -i embed | head -1)
RERANK=$(docker ps --format "{{.Names}}" | grep -i rerank | head -1)

echo "Conteneurs détectés:"
echo "  Weavink: $WEAVINK"
echo "  Redis: $REDIS"
echo "  Qdrant: $QDRANT"
echo "  Embed: $EMBED"
echo "  Rerank: $RERANK"
echo ""

echo "Statut du réseau:"
docker network inspect weavink-internal --format '{{range .Containers}}  - {{.Name}}{{"\n"}}{{end}}'
echo ""

if [ -n "$EMBED" ]; then
  echo -n "Test embed-service... "
  docker exec $EMBED curl -sf http://localhost:5555/health > /dev/null && echo "OK" || echo "ÉCHEC"
fi

if [ -n "$RERANK" ]; then
  echo -n "Test rerank-service... "
  docker exec $RERANK curl -sf http://localhost:5556/health > /dev/null && echo "OK" || echo "ÉCHEC"
fi

if [ -n "$QDRANT" ]; then
  echo -n "Test Qdrant... "
  docker exec $QDRANT curl -sf http://localhost:6333/collections > /dev/null && echo "OK" || echo "ÉCHEC"
fi

if [ -n "$REDIS" ]; then
  echo -n "Test Redis... "
  docker exec $REDIS redis-cli ping > /dev/null 2>&1 && echo "OK" || echo "ÉCHEC"
fi

echo ""
echo "=== Test Terminé ==="
```

Rendre exécutable:
```bash
chmod +x /root/test-connectivity.sh
```

---

## 11. Dépannage

### Problème: Erreurs "Connection refused"

**Cause**: Service non démarré ou pas sur le même réseau.

**Solution**:
```bash
# Vérifier si le service tourne
docker ps | grep <nom-service>

# Vérifier s'il est sur le réseau weavink-internal
docker network inspect weavink-internal

# S'il n'est pas sur le réseau, le connecter
docker network connect weavink-internal <nom-conteneur>
```

### Problème: Échec de résolution DNS / "Name does not resolve"

**Cause**: Les conteneurs ne sont pas sur le même réseau.

**Solution**:
```bash
# Vérifier que les deux conteneurs sont sur weavink-internal
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'

# Si manquant, les connecter
docker network connect weavink-internal <nom-conteneur>
```

### Problème: Nom du conteneur changé après redéploiement

**Cause**: Coolify génère un nouveau nom de conteneur au rebuild.

**Solution**:
```bash
# Trouver le nouveau nom du conteneur
docker ps --format "{{.Names}}\t{{.Image}}"

# Mettre à jour les variables d'environnement dans Coolify avec le nouveau nom
# Reconnecter au réseau
docker network connect weavink-internal <nouveau-nom-conteneur>
```

### Problème: Le service démarre puis crash (OOM)

**Cause**: Mémoire insuffisante (modèle trop grand).

**Solution**:
```bash
# Vérifier les logs
docker logs <nom-conteneur> --tail 100

# Vérifier l'utilisation mémoire
docker stats <nom-conteneur>

# Augmenter la limite mémoire dans les paramètres du service Coolify
```

### Problème: Échec des health checks dans Coolify

**Cause**: Service pas encore prêt (modèle encore en chargement).

**Solution**:
- Augmenter "Start Period" dans les paramètres de health check de Coolify
- embed-service: 120-180 secondes
- rerank-service: 90-120 secondes

---

## Référence Rapide

### Checklist de Déploiement

Pour **chaque service** que vous déployez:

- [ ] Déployer dans Coolify
- [ ] Noter le nom du conteneur via `docker ps`
- [ ] Connecter au réseau: `docker network connect weavink-internal <nom>`
- [ ] Vérifier: `docker network inspect weavink-internal`
- [ ] Mettre à jour les variables d'environnement si nécessaire

### Aide-Mémoire des Commandes

```bash
# Voir tous les conteneurs
docker ps -a

# Voir les logs d'un conteneur
docker logs <nom-conteneur> -f

# Redémarrer un conteneur
docker restart <nom-conteneur>

# Connecter au réseau
docker network connect weavink-internal <nom-conteneur>

# Vérifier les membres du réseau
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'

# Voir l'utilisation des ressources
docker stats

# Trouver le nom du conteneur par image
docker ps --filter ancestor=redis:7.2 --format "{{.Names}}"
```

### Ports des Services (Internes Uniquement)

| Service | Port Interne | Exposé? |
|---------|--------------|---------|
| Application Weavink | 3000 | Oui (via Coolify/Traefik) |
| embed-service | 5555 | Non |
| rerank-service | 5556 | Non |
| Redis | 6379 | Non |
| Qdrant | 6333 | Non |

### Services Actuellement Déployés

| Service | Nom du Conteneur | Port | Auth | Statut Réseau |
|---------|------------------|------|------|---------------|
| Redis | `s40swk408s00s4s4k8kso0gk` | 6379 | Mot de passe | ✅ Connecté |
| Qdrant | `qdrant-n8ck4s8oww0o8ckwoc0kgsc0` | 6333 | Clé API | ✅ Connecté |
| embed-service | `e0g4c0g8wsswskosgo0o00k0-124929708495` | 5555 | Aucune | ✅ Connecté |
| rerank-service | `gko04o4448o44cwgw4gk080w-133339492322` | 5556 | Aucune | ✅ Connecté |
| Application Weavink | `<en attente>` | 3000 | Session | ⏳ En attente |

### Référence des Variables d'Environnement

```bash
# Redis (copier depuis l'URL Redis de Coolify)
REDIS_URL=redis://default:<mot-de-passe>@s40swk408s00s4s4k8kso0gk:6379/0

# Qdrant
QDRANT_URL=http://qdrant-n8ck4s8oww0o8ckwoc0kgsc0:6333
QDRANT_API_KEY=di6jD05MiglTsccUwAHVXOmJQcz67fsm

# Services ML (fastembed 0.5.1)
EMBED_SERVICE_URL=http://e0g4c0g8wsswskosgo0o00k0-124929708495:5555
RERANK_SERVICE_URL=http://gko04o4448o44cwgw4gk080w-133339492322:5556
```

---

## 12. Scripts de Test

> **Note**: Ces scripts sont stockés dans cette documentation pour référence. Ils ne sont PAS conservés sur le serveur pour le garder propre. Copiez-les et exécutez-les quand nécessaire, puis supprimez-les après utilisation.

### Derniers Résultats de Test (5 déc. 2025)

Tous les services ont réussi les tests de connectivité:
```
1. Test Redis...          ✅ Redis: OK (auth requise)
2. Test Qdrant...         ✅ Qdrant: OK
3. Test embed-service...  ✅ embed-service: OK
4. Test rerank-service... ✅ rerank-service: OK
```

### Test du Service Embed

Créez ce script sur votre serveur pour tester l'embed-service:

```bash
cat > /root/test-embed.sh << 'EOF'
#!/bin/bash
EMBED_URL="http://e0g4c0g8wsswskosgo0o00k0-124929708495:5555"

echo "=== Health Check ==="
docker run --rm --network weavink-internal curlimages/curl "$EMBED_URL/health"

echo ""
echo "=== Embedding Simple ==="
docker run --rm --network weavink-internal curlimages/curl -X POST "$EMBED_URL/embed" -H "Content-Type: application/json" -d '{"text":"Développeur React"}'

echo ""
echo "=== Embedding par Lot ==="
docker run --rm --network weavink-internal curlimages/curl -X POST "$EMBED_URL/embed/batch" -H "Content-Type: application/json" -d '{"texts":["Dev React","Dev Python"]}'
EOF
chmod +x /root/test-embed.sh
```

Exécuter avec: `/root/test-embed.sh`

### Test du Service Rerank

```bash
cat > /root/test-rerank.sh << 'EOF'
#!/bin/bash
RERANK_URL="http://gko04o4448o44cwgw4gk080w-133339492322:5556"

echo "=== Health Check ==="
docker run --rm --network weavink-internal curlimages/curl "$RERANK_URL/health"

echo ""
echo "=== Test de Reclassement ==="
docker run --rm --network weavink-internal curlimages/curl -X POST "$RERANK_URL/rerank" -H "Content-Type: application/json" -d '{"query":"Développeur React","documents":["Jean est un expert React","Marie travaille au marketing","Carlos connaît Node.js"],"top_n":2}'
EOF
chmod +x /root/test-rerank.sh
```

### Test de Tous les Services

```bash
cat > /root/test-all-services.sh << 'EOF'
#!/bin/bash
echo "========================================"
echo "  TEST DE CONNECTIVITÉ SERVICES WEAVINK"
echo "========================================"
echo ""

# Conteneurs de services
REDIS_CONTAINER="s40swk408s00s4s4k8kso0gk"
QDRANT_CONTAINER="qdrant-n8ck4s8oww0o8ckwoc0kgsc0"
EMBED_CONTAINER="e0g4c0g8wsswskosgo0o00k0-124929708495"
RERANK_CONTAINER="gko04o4448o44cwgw4gk080w-133339492322"
QDRANT_API_KEY="di6jD05MiglTsccUwAHVXOmJQcz67fsm"

echo "1. Test Redis..."
docker exec $REDIS_CONTAINER redis-cli ping 2>/dev/null && echo "   ✅ Redis: OK" || echo "   ❌ Redis: ÉCHEC"

echo ""
echo "2. Test Qdrant..."
docker run --rm --network weavink-internal curlimages/curl -s -H "api-key: $QDRANT_API_KEY" "http://$QDRANT_CONTAINER:6333/collections" | grep -q "result" && echo "   ✅ Qdrant: OK" || echo "   ❌ Qdrant: ÉCHEC"

echo ""
echo "3. Test embed-service..."
docker run --rm --network weavink-internal curlimages/curl -s "http://$EMBED_CONTAINER:5555/health" | grep -q "ok" && echo "   ✅ embed-service: OK" || echo "   ❌ embed-service: ÉCHEC"

echo ""
echo "4. Test rerank-service..."
docker run --rm --network weavink-internal curlimages/curl -s "http://$RERANK_CONTAINER:5556/health" | grep -q "ok" && echo "   ✅ rerank-service: OK" || echo "   ❌ rerank-service: ÉCHEC"

echo ""
echo "5. Membres du réseau:"
docker network inspect weavink-internal --format '{{range .Containers}}   - {{.Name}}{{"\n"}}{{end}}'

echo ""
echo "========================================"
EOF
chmod +x /root/test-all-services.sh
```

Exécuter avec: `/root/test-all-services.sh`

---

## 13. Mises à Jour Futures

### Prévu: Migration Firebase → Supabase

Une future migration de Firebase vers Supabase auto-hébergé est prévue. Cette section documente les informations nécessaires pour cette migration.

#### Stack de Services Supabase (Coolify)

Coolify fournit une stack Supabase préconfigurée avec les services suivants:

| Service | Image | Objectif |
|---------|-------|----------|
| **Kong** | `kong:2.8.1` | Passerelle API - route toutes les requêtes |
| **Studio** | `supabase/studio:2025.06.02` | Interface Dashboard (comme la console Firebase) |
| **PostgreSQL** | `supabase/postgres:15.8.1.048` | Base de données principale (remplace Firestore) |
| **PostgREST** | `postgrest/postgrest:v12.2.12` | Génère automatiquement une API REST depuis le schéma DB |
| **GoTrue (Auth)** | `supabase/gotrue:v2.174.0` | Authentification (remplace Firebase Auth) |
| **Realtime** | `supabase/realtime:v2.34.47` | Abonnements WebSocket |
| **Storage** | `supabase/storage-api:v1.14.6` | Stockage de fichiers (remplace Firebase Storage) |
| **Edge Functions** | `supabase/edge-runtime:v1.67.4` | Fonctions serverless (remplace Cloud Functions) |
| **Supavisor** | `supabase/supavisor:2.5.1` | Pooler de connexions pour PostgreSQL |
| **MinIO** | `minio:RELEASE.2025-10-15` | Backend de stockage compatible S3 |
| **Analytics** | `supabase/logflare:1.4.0` | Logging et analytics |
| **Vector** | `timberio/vector:0.28.1-alpine` | Collection de logs |
| **Imgproxy** | `darthsim/imgproxy:v3.8.0` | Transformations d'images |
| **Postgres-Meta** | `supabase/postgres-meta:v0.89.3` | API de gestion de base de données |

#### Configuration Supabase Coolify

```
Nom du Service: supabase-xc444cgkow0gw4kgkwcg0cgo

Identifiants (depuis Coolify):
- Utilisateur Dashboard: 0kSZLqeJl19owZqY
- Mot de passe Dashboard: [stocké dans Coolify]
- Utilisateur Admin MinIO: Q2WuRfq2qN8wBQxh
- Mot de passe Admin MinIO: [stocké dans Coolify]
- Base de données PostgreSQL: postgres
- Mot de passe PostgreSQL: [stocké dans Coolify]
```

#### Besoins en Ressources

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| RAM | 8GB | 16GB |
| CPU | 4 cœurs | 8 cœurs |
| Disque | 50GB | 100GB+ |

#### Intégration Réseau

Après avoir déployé Supabase, connectez tous les conteneurs à `weavink-internal`:

```bash
# Obtenir tous les noms de conteneurs Supabase
docker ps --format "{{.Names}}" | grep supabase

# Connecter chacun au réseau
docker network connect weavink-internal supabasekong-xc444cgkow0gw4kgkwcg0cgo
docker network connect weavink-internal supabasedb-xc444cgkow0gw4kgkwcg0cgo
# ... répéter pour tous les conteneurs Supabase
```

#### Variables d'Environnement pour l'App Weavink

Lors de la migration, mettez à jour ces variables d'environnement:

```bash
# Actuel (Firebase)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...

# Futur (Supabase)
NEXT_PUBLIC_SUPABASE_URL=http://supabasekong-xc444cgkow0gw4kgkwcg0cgo:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<depuis-dashboard-supabase>
SUPABASE_SERVICE_ROLE_KEY=<depuis-dashboard-supabase>
DATABASE_URL=postgresql://postgres:<mot-de-passe>@supabasedb-xc444cgkow0gw4kgkwcg0cgo:5432/postgres
```

#### Checklist de Migration

- [ ] Déployer la stack Supabase dans Coolify
- [ ] Connecter tous les conteneurs Supabase au réseau `weavink-internal`
- [ ] Configurer le dashboard Supabase Studio
- [ ] Configurer le schéma PostgreSQL (migrer depuis Firestore)
- [ ] Migrer les utilisateurs Firebase Auth vers Supabase Auth
- [ ] Migrer les fichiers Firebase Storage vers Supabase Storage
- [ ] Mettre à jour les variables d'environnement de l'App Weavink
- [ ] Mettre à jour le code de l'application pour utiliser le SDK Supabase
- [ ] Tester toutes les fonctionnalités
- [ ] Désactiver Firebase

#### Fonctionnalités Firebase à Migrer

| Fonctionnalité Firebase | Équivalent Supabase |
|-------------------------|---------------------|
| Firebase Auth | Supabase Auth (GoTrue) |
| Firestore | PostgreSQL + PostgREST |
| Firebase Storage | Supabase Storage + MinIO |
| Cloud Functions | Edge Functions |
| Realtime Database | Supabase Realtime |

#### Architecture Après Migration

```mermaid
flowchart TB
    subgraph DockerNetwork["🔒 Réseau Docker: weavink-internal"]
        subgraph WeavinkApp["📦 Application Weavink"]
            NextJS["⚛️ Next.js<br/>Port 3000"]
        end

        subgraph Supabase["🗄️ Stack Supabase"]
            subgraph SupabaseTop["Couche API & UI"]
                Kong["🔀 Kong<br/>:8000"]
                Studio["📊 Studio<br/>:3000"]
                Auth["🔐 Auth<br/>:9999"]
            end
            subgraph SupabaseBottom["Couche Données"]
                Postgres["🐘 Postgres<br/>:5432"]
                Storage["📁 Storage<br/>:5000"]
                Realtime["⚡ Realtime<br/>:4000"]
            end
        end

        subgraph MLServices["🤖 Services ML"]
            Embed["📊 embed-service<br/>:5555"]
            Rerank["🔄 rerank-service<br/>:5556"]
        end

        subgraph DataStores["💾 Stockages de Données"]
            Redis["🔴 Redis<br/>:6379"]
            Qdrant["🔷 Qdrant<br/>:6333"]
        end

        NextJS --> Kong
        NextJS --> Embed
        NextJS --> Rerank
        NextJS --> Redis
        NextJS --> Qdrant
    end

    classDef app fill:#e8f5e9,stroke:#2e7d32
    classDef supabase fill:#e3f2fd,stroke:#1565c0
    classDef ml fill:#fff3e0,stroke:#ef6c00
    classDef data fill:#fce4ec,stroke:#c2185b

    class NextJS app
    class Kong,Studio,Auth,Postgres,Storage,Realtime supabase
    class Embed,Rerank ml
    class Redis,Qdrant data
```

#### Notes Importantes

1. **Ne pas déployer Supabase encore** - Terminer d'abord le déploiement de l'App Weavink
2. **Planification des ressources** - Supabase ajoute une surcharge significative en ressources
3. **Migration des données** - Planifier la conception du schéma Firestore → PostgreSQL
4. **Temps d'arrêt** - Prévoir une fenêtre de migration avec un temps d'arrêt potentiel
5. **Plan de rollback** - Garder Firebase en fonctionnement jusqu'à ce que Supabase soit entièrement testé
