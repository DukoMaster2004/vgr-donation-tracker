import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { serveSite } from "./adapter.mjs";
import { createSiteHandler } from "./handler.mjs";

const env = (name: string) => Deno.env.get(name);

Deno.serve(serveSite(createSiteHandler(env), {
  createClient,
  env,
}));
