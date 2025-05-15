import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Worlds } from "../target/types/worlds";
//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED
//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED
//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED
//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED
describe("worlds", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Worlds as Program<Worlds>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED
//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED
//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED
//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED//OUTDATED