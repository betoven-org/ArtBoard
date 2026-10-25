import { createClient } from '@/lib/supabase/client'

export async function uploadImage(file: File, path: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const fileName = `${path}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('uploads')
    .upload(fileName, file, { upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage
    .from('uploads')
    .getPublicUrl(fileName)

  return data.publicUrl
}
