// Supabase Client Initialization
// Documentation: https://supabase.com/docs/reference/javascript/initializing

// We use the anon key for client-side operations.
// The anon key is intentionally public — it is safe to include here.
// NEVER put your service_role key, secret key, or database password in client-side code.
const _supabaseUrl = 'https://panxaqueawnqrebikwvb.supabase.co';
const _supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbnhhcXVlYXducXJlYmlrd3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzg4NjEsImV4cCI6MjEwNjM1NDg2MX0.Ndnv34Hw_3H3MZeqx2fLs8LxIVoH300WJt12Cceo8qQ';

// Initialize immediately (no defer) so auth guards can access the client synchronously
if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(_supabaseUrl, _supabaseAnonKey);
} else {
  // Fallback: wait for the CDN script to finish if somehow not ready yet
  document.currentScript && document.currentScript.addEventListener('load', () => {
    window.supabaseClient = window.supabase.createClient(_supabaseUrl, _supabaseAnonKey);
  });
}
