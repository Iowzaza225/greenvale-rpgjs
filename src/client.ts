import { provideMmorpg, startGame } from "@rpgjs/client";
import configClient from "./config/config.client";
import startServer from "./server";
import "./styles.css";

startGame({
  ...configClient,
  providers: [configClient.providers, provideMmorpg(startServer)],
});
