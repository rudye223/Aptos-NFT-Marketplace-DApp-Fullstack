import React, { useState } from "react";
import { Button, Input, Select, message } from "antd";
import { AptosClient, AptosAccount } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

const { Option } = Select;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

const Transfer = () => {
  const { signAndSubmitTransaction, account } = useWallet();
  const [transferType, setTransferType] = useState<string>("APT");
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [nftCreator, setNftCreator] = useState<string>("");
  const [nftCollection, setNftCollection] = useState<string>("");
  const [nftName, setNftName] = useState<string>("");

  const handleTransfer = async () => {
    if (!account) {
      message.error("Wallet not connected!");
      return;
    }

    if (!recipient) {
      message.error("Recipient address is required.");
      return;
    }

    try {
      if (transferType === "APT") {
        if (amount <= 0) {
          message.error("Amount must be greater than 0.");
          return;
        }

        const payload = {
          type: "entry_function_payload",
          function: "0x1::aptos_account::transfer",
          arguments: [recipient, (amount * 1_000_000).toString()], // APT -> Octas
          type_arguments: [],
        };
        const  txn = await (window as any).aptos.signAndSubmitTransaction(payload);
        await client.waitForTransaction(txn.hash);

        message.success("APT transfer successful!");
      } else if (transferType === "NFT") {
        if (!nftCreator || !nftCollection || !nftName) {
          message.error("NFT details are required (Creator, Collection, Name).");
          return;
        }

        const payload = {
          type: "entry_function_payload",
          function: "0x3::token::transfer",
          arguments: [recipient, nftCreator, nftCollection, nftName, 1], // Transfer 1 copy
          type_arguments: [],
        };

        const  txn = await (window as any).aptos.signAndSubmitTransaction(payload);
        await client.waitForTransaction(txn.hash);

        message.success("NFT transfer successful!");
      }
    } catch (error) {
      console.error("Transfer failed:", error);
      message.error("Transfer failed. Check console for details.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2>Transfer APT or NFTs</h2>

      <Select
        value={transferType}
        onChange={(value) => setTransferType(value)}
        style={{ width: "100%", marginBottom: "20px" }}
      >
        <Option value="APT">APT Transfer</Option>
        <Option value="NFT">NFT Transfer</Option>
      </Select>

      <Input
        placeholder="Recipient Address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        style={{ marginBottom: "20px" }}
      />

      {transferType === "APT" ? (
        <Input
          placeholder="Amount in APT"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{ marginBottom: "20px" }}
        />
      ) : (
        <>
          <Input
            placeholder="NFT Creator Address"
            value={nftCreator}
            onChange={(e) => setNftCreator(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <Input
            placeholder="NFT Collection Name"
            value={nftCollection}
            onChange={(e) => setNftCollection(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <Input
            placeholder="NFT Name"
            value={nftName}
            onChange={(e) => setNftName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
        </>
      )}

      <Button type="primary" onClick={handleTransfer}>
        Transfer {transferType === "APT" ? "APT" : "NFT"}
      </Button>
    </div>
  );
};

export default Transfer;
