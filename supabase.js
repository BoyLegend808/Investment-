// Supabase Client Initialization
// Documentation: https://supabase.com/docs/reference/javascript/initializing

// We use the anon key for client-side operations.
// The anon key is intentionally public — it is safe to include here.
// NEVER put your service_role key, secret key, or database password in client-side code.
const _supabaseUrl = 'https://panxaqueawnqrebikwvb.supabase.co';
const _supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbnhhcXVlYXducXJlYmlrd3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzg4NjEsImV4cCI6MjEwNjM1NDg2MX0.Ndnv34Hw_3H3MZeqx2fLs8LxIVoH300WJt12Cceo8qQ';

// Initialize the Supabase client.
// The CDN script tag loads synchronously (no defer/async), so window.supabase
// should be available by the time this file executes. But we add a robust
// fallback just in case.
function _initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(_supabaseUrl, _supabaseAnonKey);
    return true;
  }
  return false;
}

if (!_initSupabase()) {
  // CDN hasn't finished yet — poll briefly until it's ready
  var _sbRetries = 0;
  var _sbTimer = setInterval(function() {
    if (_initSupabase() || ++_sbRetries > 60) {
      clearInterval(_sbTimer);
      if (!window.supabaseClient) {
        console.error('[Crest Supabase] Failed to initialize — CDN script did not load.');
      }
    }
  }, 50);
}
