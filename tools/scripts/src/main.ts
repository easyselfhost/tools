import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as cmds from "./cmds/index.js";

yargs(hideBin(process.argv))
  .command(cmds.CheckCommand)
  .command(cmds.UpCommand)
  .command(cmds.DownCommand)
  .command(cmds.SecretCommand)
  .strictCommands()
  .demandCommand()
  .parse();
