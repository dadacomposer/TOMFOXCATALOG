import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { updates } = await req.json()
    console.log(`Received ${updates.length} updates`)
    
    let successCount = 0
    let errCount = 0
    for (const update of updates) {
      const { error } = await supabase.from('tracks').update(update.data).eq('id', update.id)
      if (error) {
        console.error("Error updating", update.id, error)
        errCount++
      } else {
        successCount++
      }
    }
    
    return new Response(JSON.stringify({ success: true, successCount, errCount }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
