import { DevUiPage } from "@/routes/dev/ui";

// Sampai F0-06 memasang routing sungguhan, /dev/ui adalah satu-satunya
// layar yang ada — dirender langsung di sini biar bisa dites di device.
export function App() {
  return <DevUiPage />;
}
