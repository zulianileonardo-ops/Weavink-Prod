//app/dashboard/layout.jsx
/**
 * THIS FILE HAS BEEN REFRACTORED
 */
"use client"
import { Inter } from 'next/font/google'
import { usePathname } from 'next/navigation'
import NavBar from '../components/General Components/NavBar'
import { Toaster } from 'react-hot-toast'
import Preview from './general components/Preview'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardProvider } from './DashboardContext'
import { MapVisibilityProvider } from './MapVisibilityContext'
import LanguageInitializer from './LanguageInitializer'
import OnboardingGuard from './components/OnboardingGuard'
import { TutorialProvider } from '@/contexts/TutorialContext'
import TutorialGuard from '@/components/tutorial/TutorialGuard'
import TutorialOverlay from '@/components/tutorial/TutorialOverlay'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
    const pathname = usePathname()

    // Check if we're on the enterprise page
    const isEnterprisePage = pathname?.includes('/enterprise')

    return (
        <ProtectedRoute>
            <OnboardingGuard>
                <LanguageInitializer />
                <TutorialProvider>
                    <DashboardProvider>
                        <MapVisibilityProvider>
                            <div className='w-full h-screen overflow-x-hidden overflow-y-auto relative bg-black bg-opacity-[.05] p-2 flex flex-col'>
                                <Toaster position="bottom-right" />
                                <NavBar />
                                <div className="flex sm:px-3 px-2 w-full flex-1">
                                    {children}
                                    {/* Only show Preview component if NOT on enterprise page */}
                                    {/* The enterprise page will handle its own TeamPreview component */}
                                    {!isEnterprisePage && <Preview />}
                                </div>
                            </div>
                        </MapVisibilityProvider>
                    </DashboardProvider>
                    {/* Tutorial Guard - Checks if tutorial should auto-start */}
                    <TutorialGuard />
                    {/* Tutorial Overlay - Renders the Joyride tour */}
                    <TutorialOverlay />
                </TutorialProvider>
            </OnboardingGuard>
        </ProtectedRoute>
    )
}