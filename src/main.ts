import { createApp } from "./app/createApp";
import "./ui/styles/theme.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element.");
}

createApp(root);
