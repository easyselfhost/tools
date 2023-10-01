import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as cmds from "./cmds/index.js";

const version = "0.0.4";

yargs(hideBin(process.argv))
  .command(cmds.CheckCommand)
  .command(cmds.UpCommand)
  .command(cmds.DownCommand)
  .command(cmds.SecretCommand)
  .version(version)
  .strictCommands()
  .demandCommand()
  .parse();
