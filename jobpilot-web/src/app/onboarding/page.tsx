"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import ResumeUploadStep from "@/components/onboarding/ResumeUploadStep"
import PreferencesStep from "@/components/onboarding/PreferencesStep"
import ReminderStep from "@/components/onboarding/ReminderStep"
import BillingStep from "@/components/onboarding/BillingStep"
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { completeOnboarding } from "@/lib/actions/onboarding"

export default function OnboardingPage() {
   const router = useRouter()
   const [step, setStep] = useState(1)
   const [data, setData] = useState({
      resume: null,
      preferences: null,
      reminders: null,
      billing: null
   })

   const updateData = (key: string, value: any) => {
      setData(prev => ({ ...prev, [key]: value }))
      setStep(prev => prev + 1)
   }

   const [isSubmitting, setIsSubmitting] = useState(false)

   const handleComplete = async (billingData: any) => {
      setIsSubmitting(true)
      const finalData = { ...data, billing: billingData }

      try {
         const result = await completeOnboarding(finalData)
         if (result.success) {
            router.push("/dashboard")
         } else {
            alert("Failed to save onboarding data: " + result.error)
         }
      } catch (err) {
         alert("Something went wrong during activation.")
      } finally {
         setIsSubmitting(false)
      }
   }

   const steps = [
      { title: "Blueprint", icon: <Sparkles size={16} /> },
      { title: "Preferences", icon: <Sparkles size={16} /> },
      { title: " Briefing", icon: <Sparkles size={16} /> },
      { title: "Activation", icon: <Sparkles size={16} /> }
   ]

   return (
      <div className="min-h-screen bg-surface flex flex-col items-center py-12 px-6 selection:bg-primary/10">
         <div className="w-full max-w-4xl relative">
            <header className="mb-20 flex flex-col items-center">
               <div className="flex items-center gap-3 mb-16 opacity-80 group cursor-pointer" onClick={() => router.push("/")}>
                  <div className="w-8 h-8 signature-gradient rounded flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/20">J</div>
                  <span className="text-xl font-bold tracking-tighter italic">Applyrd</span>
               </div>

               <div className="flex items-center gap-8 md:gap-14 relative px-4">
                  {steps.map((s, i) => (
                     <div key={i} className="relative z-10 flex flex-col items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-500
                    ${step === i + 1 ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-110 border-none' :
                              step > i + 1 ? 'bg-success text-white shadow-xl shadow-success/10 border-none' :
                                 'bg-surface-container-low text-muted-foreground border border-border/10 opacity-50'}`}>
                           {step > i + 1 ? "✓" : i + 1}
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest transition-opacity duration-500 
                    ${step === i + 1 ? 'text-primary' : 'text-muted-foreground opacity-40'}`}>
                           {s.title}
                        </div>
                     </div>
                  ))}

                  {/* Dynamic Progress Line */}
                  <div className="absolute top-6 left-10 right-10 h-0.5 bg-muted/40 overflow-hidden">
                     <motion.div
                        className="h-full signature-gradient origin-left"
                        animate={{ scaleX: (step - 1) / (steps.length - 1) }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                     />
                  </div>
               </div>
            </header>

            <main className="min-h-[500px] animate-in fade-in slide-in-from-bottom-6 duration-1000">
               <AnimatePresence mode="wait">
                  {step === 1 && (
                     <motion.div key="step1" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5 }}>
                        <div className="text-center mb-10 space-y-3">
                           <h2 className="text-4xl font-bold tracking-tight">Technical Archetype.</h2>
                           <p className="text-muted-foreground text-lg font-medium">Upload your current resume to initialize the agents.</p>
                        </div>
                        <ResumeUploadStep onSuccess={(d) => updateData("resume", d)} />
                     </motion.div>
                  )}

                  {step === 2 && (
                     <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.5 }}>
                        <div className="text-center mb-10 space-y-3">
                           <h2 className="text-4xl font-bold tracking-tight">Strategic Intent.</h2>
                           <p className="text-muted-foreground text-lg font-medium">Define your target roles and technical seniority.</p>
                        </div>
                        <PreferencesStep
                           onSuccess={(d) => updateData("preferences", d)}
                           onBack={() => setStep(1)}
                        />
                     </motion.div>
                  )}

                  {step === 3 && (
                     <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.5 }}>
                        <div className="text-center mb-10 space-y-3">
                           <h2 className="text-4xl font-bold tracking-tight">Briefing Protocol.</h2>
                           <p className="text-muted-foreground text-lg font-medium">Select your delivery window for daily tailored packages.</p>
                        </div>
                        <ReminderStep
                           onSuccess={(d) => updateData("reminders", d)}
                           onBack={() => setStep(2)}
                        />
                     </motion.div>
                  )}

                  {step === 4 && (
                     <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.5 }}>
                        <div className="text-center mb-10 space-y-3">
                           <h2 className="text-4xl font-bold tracking-tight">System Activation.</h2>
                           <p className="text-muted-foreground text-lg font-medium">Choose a node capacity to deploy your agents.</p>
                        </div>
                        <BillingStep
                           onComplete={handleComplete}
                           onBack={() => setStep(3)}
                        />
                     </motion.div>
                  )}
               </AnimatePresence>
            </main>

            {step > 1 && (
               <Button
                  variant="ghost"
                  onClick={() => setStep(prev => prev - 1)}
                  className="absolute top-24 -left-20 hidden lg:flex items-center gap-2 text-muted-foreground no-line hover:bg-surface-container-low h-12 px-6 rounded-xl font-bold text-sm"
               >
                  <ArrowLeft size={16} /> Go Back
               </Button>
            )}
         </div>
      </div>
   )
}
