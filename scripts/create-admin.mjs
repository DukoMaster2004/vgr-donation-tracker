// One-off admin provisioning script. Run with:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admin.mjs [email] [password]
// The service role key is required (Supabase project settings -> API -> service_role).
// Never commit that key or run this script from client-side code.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "https://iaysswqvpbycocawjsgf.supabase.co";
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const email = process.argv[2] ?? "ssj52949@gmail.com";
const password = process.argv[3] ?? "josue20026";

if (!SERVICE_ROLE_KEY) {
  console.error(
    "Falta SUPABASE_SERVICE_ROLE_KEY. Obténgalo en Supabase → Project Settings → API y vuelva a ejecutar:",
  );
  console.error('  SUPABASE_SERVICE_ROLE_KEY="..." node scripts/create-admin.mjs');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw new Error(listError.message);
  let user = list.users.find((u) => u.email === email);

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    user = data.user;
    console.log(`Usuario existente actualizado: ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    user = data.user;
    console.log(`Usuario creado: ${email}`);
  }

  const { error: roleError } = await admin
    .from("user_roles")
    .upsert(
      { user_id: user.id, role: "admin" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );
  if (roleError) throw new Error(roleError.message);

  console.log("Rol de administrador asignado correctamente.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
