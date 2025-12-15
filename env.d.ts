/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAZORPAY_KEY_ID: string;
  // add other VITE_ vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
