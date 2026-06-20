/** Minimal Deno globals for Supabase Edge Functions (IDE type-checking only). */
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}
