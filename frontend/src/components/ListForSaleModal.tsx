import React, { useState } from "react";
import { Modal, Input, Button, message } from "antd";
import { AptosClient } from "aptos";
import { MARKET_PLACE_ADDRESS } from "../Constants";

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

interface ListForSaleModalProps {
  isVisible: boolean;
  onClose: () => void;
  nftDetails: any;
  onRefresh: () => Promise<void>;
}

const ListForSaleModal: React.FC<ListForSaleModalProps> = ({ isVisible, onClose, nftDetails, onRefresh }) => {
  const [salePrice, setSalePrice] = useState<string>("");

  const handleConfirmListing = async () => {
    if (!salePrice) return;

    try {
      
      const precision = 100000000; // This assumes 8 decimals for the token
      // Step 2: Scale the   amount to avoid floating point precision issues
     const priceInOctas = BigInt(Math.ceil(parseFloat(salePrice) * precision));
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::list_for_sale`,
        type_arguments: [],
        arguments: [MARKET_PLACE_ADDRESS, nftDetails.id.toString(), priceInOctas.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT listed for sale successfully!");
      setSalePrice("");
      onClose();
      await onRefresh();
    } catch (error) {
      console.error("Error listing NFT for sale:", error);
      message.error("Failed to list NFT for sale.");
    }
  };

  return (
    <Modal
      title="List NFT for Sale"
      visible={isVisible}
      onCancel={onClose}
      footer={null}
    >
      <Input
        placeholder="Enter sale price (in APT)"
        value={salePrice}
        onChange={(e) => setSalePrice(e.target.value)}
        type="number"
        style={{ marginBottom: "20px" }}
      />
      <Button type="primary" block onClick={handleConfirmListing}>
        Confirm
      </Button>
    </Modal>
  );
};

export default ListForSaleModal;
