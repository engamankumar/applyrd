"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Check, AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { useResumeParser } from "@/hooks/useAgent"

interface ResumeUploadStepProps {
  onSuccess: (data: any) => void
}

export default function ResumeUploadStep({ onSuccess }: ResumeUploadStepProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [parsing, setParsing] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf")) {
        setFile(selectedFile)
        startUpload(selectedFile)
      } else {
        alert("Please upload a PDF file.")
      }
    }
  }

  const startUpload = (selectedFile: File) => {
    setUploading(true)
    let p = 0
    const interval = setInterval(() => {
      p += 10
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setUploading(false)
        startParsing(selectedFile)
      }
    }, 150)
  }

  const { mutateAsync: parseResume } = useResumeParser()

  const startParsing = async (fileToParse: File) => {
    setParsing(true)
    try {
      const response = await parseResume(fileToParse)
      if (response && response.status === "success" && response.data) {
        setParsedData(response.data)
      } else {
        alert("Failed to parse resume: " + (response?.message || "Internal Error"))
      }
    } catch (e) {
      console.error(e)
      alert("Error parsing resume. Please check your connection to the Agent Service.")
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-10 selection:bg-primary/10">
      <div 
        onClick={() => !uploading && !parsing && !parsedData && fileInputRef.current?.click()}
        className={`relative group p-14 rounded-[2.5rem] border-2 border-dashed transition-all duration-500 cursor-pointer flex flex-col items-center justify-center text-center
          ${file ? 'border-primary bg-primary/5' : 'border-border/20 hover:border-primary/40 bg-surface-container-low hover:bg-surface-container-lowest'}`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf" 
          onChange={handleFileChange} 
        />
        
        <AnimatePresence mode="wait">
          {!file && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-xl shadow-primary/5 mb-2 mx-auto">
                <Upload size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold tracking-tight">Drop your PDF architecture.</h4>
                <p className="text-muted-foreground text-sm font-medium">Standard format resumes preferred for deep parsing.</p>
              </div>
            </motion.div>
          )}

          {file && (
            <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 w-full max-w-md">
              <div className="flex items-center gap-6 p-6 bg-surface-container-lowest rounded-3xl shadow-2xl shadow-primary/5">
                <div className="w-16 h-16 rounded-2xl signature-gradient flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="font-bold text-on-surface truncate">{file.name}</h4>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • READY
                  </p>
                </div>
                {progress === 100 && !parsing && <Check size={24} className="text-success" />}
              </div>

              {(uploading || parsing) && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse flex items-center gap-2">
                      <Sparkles size={12} className="match-pulse" />
                      {uploading ? "Uploading Node Contents" : "AI Agent Analysis In-Progress"}
                    </span>
                    <span className="text-[10px] font-data text-primary font-bold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-primary/10" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {parsedData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[2rem] bg-surface-container-low border border-white shadow-sm space-y-8">
            <div className="flex items-start justify-between">
               <div className="space-y-1">
                 <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Extracted Identity</div>
                 <h3 className="text-2xl font-bold tracking-tight">{parsedData.name} ({parsedData.title})</h3>
               </div>
               <div className="px-3 py-1 bg-success/10 text-success rounded-full text-[10px] font-bold uppercase tracking-widest border border-success/10">Parsed Successfully</div>
            </div>

            <div className="grid grid-cols-2 gap-10">
               <div className="space-y-4">
                 <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Technical Arsenal</div>
                 <div className="flex flex-wrap gap-2">
                   {parsedData.skills.map((skill: string) => (
                     <span key={skill} className="px-3 py-1.5 bg-surface-container-lowest rounded-xl text-[11px] font-bold border border-border/5 hover:border-primary/20 transition-colors shadow-sm">{skill}</span>
                   ))}
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Career Depth</div>
                 <div className="text-xl font-bold tracking-tight">{parsedData.experience}</div>
               </div>
            </div>

            <Button 
               onClick={() => onSuccess(parsedData)} 
               className="w-full signature-gradient h-14 rounded-2xl text-md font-bold shadow-xl shadow-primary/10 hover:translate-y-[-2px] transition-all"
            >
               Confirm & Initialize Preferences <Check size={18} className="ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
