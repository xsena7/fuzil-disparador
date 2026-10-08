import { savePlatformSetting } from "../../src/lib/platform-settings";
savePlatformSetting(process.argv[2] as never, process.argv[3]).then(() => process.exit(0));
