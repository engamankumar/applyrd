import axios from "axios"
import { useMutation } from "@tanstack/react-query"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || "http://localhost:8000"

export const useResumeParser = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await axios.post(`${AGENT_API}/agent/parse-resume`, formData)
      return data
    }
  })
}

export const useJobSearch = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.post(`${AGENT_API}/agent/search-jobs`, payload)
      return data
    }
  })
}

export const useCoverLetter = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.post(`${AGENT_API}/agent/generate-cover-letter`, payload)
      return data
    }
  })
}

export const useInterviewPrep = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.post(`${AGENT_API}/agent/interview-prep`, payload)
      return data
    }
  })
}

export const useMockInterview = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.post(`${AGENT_API}/agent/mock-interview`, payload)
      return data
    }
  })
}

export const useGapAnalysis = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.post(`${AGENT_API}/agent/gap-analysis`, payload)
      return data
    }
  })
}

export const useTailorResume = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.post(`${AGENT_API}/agent/tailor-resume`, payload)
      return data
    }
  })
}
export const useScheduleNotification = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.post(`${AGENT_API}/agent/schedule-notification`, payload)
      return data
    }
  })
}
