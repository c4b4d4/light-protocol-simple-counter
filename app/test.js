import {
    bn,
    defaultStaticAccountsStruct,
    defaultTestStateTreeAccounts,
    deriveAddress,
    Rpc,
    packCompressedAccounts,
    packNewAddressParams,
    LightSystemProgram,
    getIndexOrAdd,
    createCompressedAccount,
    createRpc,
  } from "@lightprotocol/stateless.js";
  import { keccak_256 } from '@noble/hashes/sha3'
  import {PublicKey,Connection,SystemProgram,Keypair,ComputeBudgetProgram,TransactionMessage,VersionedTransaction,sendAndConfirmRawTransaction} from "@solana/web3.js";
  import { CompressedTokenProgram, POOL_SEED } from "@lightprotocol/compressed-token";

import * as anchor from '@project-serum/anchor';
import BN from "bn.js"


import bs58 from "bs58";
  

import {keyPath, idlPath, endpoint,programKey} from "./const.js";

const idl = JSON.parse(fs.readFileSync(idlPath)+"")

const keyValue = Buffer.from(JSON.parse((fs.readFileSync(keyPath)+"").trim()));

const wallet = Keypair.fromSecretKey(keyValue)

  const rpc = createRpc(endpoint, endpoint, endpoint, {
    commitment: "confirmed",
  });

import fs from "fs";

export function hashvToBn254FieldSizeBe(bytes) {
    const hasher = keccak_256.create()
    for (const input of bytes) {
      hasher.update(input)
    }
    const hash = hasher.digest()
    hash[0] = 0
    return hash
  }
  
  
  export function deriveAddressSeed(
    seeds,
    programId
  ) {
    const combinedSeeds = [programId.toBytes(), ...seeds]
    const hash = hashvToBn254FieldSizeBe(combinedSeeds)
    return hash
  }



class Worlds {
    programKey = new PublicKey(programKey)
    globalTreePDA({signer}){
            return PublicKey.findProgramAddress(
                [Buffer.from('counter'),signer.toBytes()],
                
                this.programKey
          );
    }

    cpiPDA(){
        return PublicKey.findProgramAddress(
            [Buffer.from('cpi_authority')],
            
            this.programKey
      );
}

    constructor(){
        //this.super();
        this.wallet = wallet;
        this.program = new anchor.Program(idl, this.programKey, {wallet, sendAndConfirm:{}});

        const connection = new Connection(endpoint,{commitment: 'confirmed'});
        this.connection = connection;
    }

    packNew(
        outputCompressedAccounts,//: CompressedAccount[],
        newAddressesParams,//: NewAddressParams[],
        proof,//: CompressedProofWithContext,
        trees,
        addressQueue
      ) {
        const { remainingAccounts: _remainingAccounts } = packCompressedAccounts(
          [],
          proof.rootIndices,
          outputCompressedAccounts,
          trees
        );
        const { newAddressParamsPacked, remainingAccounts } = packNewAddressParams(
          newAddressesParams,
          _remainingAccounts
        );
        let merkleContext/*: PackedMerkleContext*/ = {
          leafIndex: 0,
          merkleTreePubkeyIndex: getIndexOrAdd(remainingAccounts, trees[0]),
          nullifierQueuePubkeyIndex: getIndexOrAdd(
            remainingAccounts,
            addressQueue
          ),
          queueIndex: null,
        };
        let {
          addressMerkleTreeAccountIndex,
          addressMerkleTreeRootIndex,
          addressQueueAccountIndex,
        } = newAddressParamsPacked[0];
        return {
          addressMerkleContext: {
            addressMerkleTreePubkeyIndex: addressMerkleTreeAccountIndex,
            addressQueuePubkeyIndex: addressQueueAccountIndex,
          },
          addressMerkleTreeRootIndex,
          merkleContext,
          remainingAccounts,
        };
      }

      async getValidityProof(
        rpc/*: Rpc*/,
        inputHashes/*?: BN[]*/,
        newUniqueAddresses/*?: PublicKey[]*/
      ) {
        const outputHashes = newUniqueAddresses?.map((addr) => bn(addr.toBytes()));
        return await rpc.getValidityProof(inputHashes, outputHashes);
      }

      getNewAddressParams(
        addressSeed/*: Uint8Array*/,
        proof/*: CompressedProofWithContext*/
      ) {
        const addressParams/*: NewAddressParams*/ = {
          seed: addressSeed,
          addressMerkleTreeRootIndex:
            proof.rootIndices[proof.rootIndices.length - 1],
          addressMerkleTreePubkey: proof.merkleTrees[proof.merkleTrees.length - 1],
          addressQueuePubkey:
            proof.nullifierQueues[proof.nullifierQueues.length - 1],
        };
        return addressParams;
      }


      async sendTransaction({transaction,creator,simulate}){
        if (!transaction.serializeMessage) transaction.serializeMessage = () => (transaction.message.serialize())
        
        const options = {skipPreflight: true, maxRetries:0, commitment:"confirmed", confirmTransactionInitialTimeout:60000}
        
        if(simulate || this.simulate){
        
            const simulation = await this.connection.simulateTransaction(transaction,{sigVerify:false,accounts:{addresses:[creator],jsonParsed:true}});
            
            console.log("&***** SIMULATION *****&");
            console.log(simulation?.value?.logs.join("\n\n"));	
            if(simulation?.value?.err){
                console.log(simulation?.value?.err);	
            } 
            
            console.log("&***** END *****&");
            
        } else {
            const rawTransaction = transaction.serialize();
            let sent;
            try{
                sent = await sendAndConfirmRawTransaction(this.connection, rawTransaction, options);
            }catch(e){
                sent = null;
            }
            console.log("Transaction Confirmed:",sent);
            return sent;
        }
        return false;
    }
}

const worlds = new Worlds()

const { addressTree, addressQueue, nullifierQueue, merkleTreeRootIndex } = defaultTestStateTreeAccounts()


const seed = deriveAddressSeed(
    [Buffer.from('counter'), wallet.publicKey.toBytes()],
    worlds.programKey
)

const address = await deriveAddress(seed, addressTree)
const compressedAccount = createCompressedAccount(
    wallet.publicKey,
    bn(10),
    undefined,
    [address.toBytes()],
)
const addressAccount = await rpc.getCompressedAccount(
    new BN(address.toBytes())
  );

  const outputCompressedAccounts = [compressedAccount];
const inputCompressedAccounts = [addressAccount];

const systemKeys = defaultStaticAccountsStruct();
const newUniqueAddresses = [address];
const proof = await worlds.getValidityProof(
    rpc,
    undefined,
    newUniqueAddresses
  );


const newAddressesParams = [];
newAddressesParams.push(worlds.getNewAddressParams(seed, proof));

const {
    addressMerkleContext,
    addressMerkleTreeRootIndex,
    merkleContext,
    remainingAccounts,
  } = worlds.packNew(outputCompressedAccounts, newAddressesParams, proof, proof.merkleTrees, addressQueue);


const [cpiSigner] = await worlds.cpiPDA();

const tx = await worlds.program.methods.create(
    [], //inputs
    proof.compressedProof,
    merkleContext,
    merkleTreeRootIndex,
    addressMerkleContext,
    addressMerkleTreeRootIndex
).accounts({
  signer: wallet.publicKey,
  selfProgram: worlds.programKey,
  cpiSigner: cpiSigner,
  lightSystemProgram: LightSystemProgram.programId,
  systemProgram: SystemProgram.programId,
  accountCompressionProgram: systemKeys.accountCompressionProgram,
  registeredProgramPda: systemKeys.registeredProgramPda,
  noopProgram: systemKeys.noopProgram,
  accountCompressionAuthority: systemKeys.accountCompressionAuthority,
}).remainingAccounts(remainingAccounts.map((r)=>{
    return {
        pubkey: r,
        isSigner: false,
        isWritable: true,
      }
})).instruction();

const recentBlockhash = (await worlds.connection.getLatestBlockhash("finalized")).blockhash;
console.log("recentBlockhash",recentBlockhash)
console.log("recentBlockhash",wallet.publicKey)

const compute = ComputeBudgetProgram.setComputeUnitPrice({microLamports:50000})
const limit = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 })

const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash,
    instructions: [compute,limit,tx],
}).compileToV0Message();

const transaction = new VersionedTransaction(messageV0);
transaction.sign([wallet]);
const g = await worlds.sendTransaction({transaction,creator:wallet.publicKey,simulate:1});