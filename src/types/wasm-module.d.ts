// unwasm (Nitro's WASM loader) exposes imported .wasm files as precompiled modules;
// on Cloudflare Workers this is a WebAssembly.Module compiled by workerd at deploy time.
declare module "*.wasm?module" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}
