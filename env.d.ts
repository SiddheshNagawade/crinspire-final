/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAZORPAY_KEY_ID: string;
  // add other VITE_ vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Allow Deno npm specifier for Razorpay in edge functions
declare module "npm:razorpay@2.9.2";
declare module "https://deno.land/std@0.168.0/http/server.ts";
