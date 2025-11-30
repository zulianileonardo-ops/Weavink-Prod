from pinecone import Pinecone
import json

# Initialize
pc = Pinecone(api_key="pcsk_3TPa9x_HWe7pJ1m15vr43vtbxjNsWNHsuhrfWE4GR4Xta8FMvGK5EAe2gCEvdaqkWYESGm")
index = pc.Index("weavink", host="weavink-z1mz108.svc.aped-4627-b74a.pinecone.io")

# Get stats
stats = index.describe_index_stats()
print(f"Total vectors: {stats.total_vector_count}")

all_vectors = []

# Export each namespace
for namespace in stats.namespaces.keys():
    print(f"\nExporting namespace: '{namespace}'")
    
    ids_list = []
    for ids_batch in index.list(namespace=namespace):
        ids_list.extend(ids_batch)
    
    print(f"  Found {len(ids_list)} IDs")
    
    # Fetch in batches of 100
    for i in range(0, len(ids_list), 100):
        batch_ids = ids_list[i:i+100]
        fetched = index.fetch(ids=batch_ids, namespace=namespace)
        
        for id, vec in fetched.vectors.items():
            all_vectors.append({
                "id": id,
                "values": vec.values,
                "metadata": vec.metadata if vec.metadata else {},
                "namespace": namespace
            })

# Save to file
with open("pinecone_export.json", "w") as f:
    json.dump(all_vectors, f)

print(f"\n✅ Exported {len(all_vectors)} vectors to pinecone_export.json")
