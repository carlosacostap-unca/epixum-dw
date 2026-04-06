import { createServerClient } from "./lib/pocketbase-server";

async function test() {
    const pb = await createServerClient();
    // we need to login as admin or just test the API
}
