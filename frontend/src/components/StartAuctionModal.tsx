import React, { useState } from "react";
import { Modal, Input, Button, message, DatePicker } from "antd";
import { AptosClient } from "aptos";
import { MARKET_PLACE_ADDRESS } from "../Constants";
import dayjs, { Dayjs } from "dayjs";  // Use dayjs instead of moment

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

interface StartAuctionModalProps {
  isVisible: boolean;
  onClose: () => void;
  nftDetails: any;
  onRefresh: () => Promise<void>;
}

const StartAuctionModal: React.FC<StartAuctionModalProps> = ({
  isVisible,
  onClose,
  nftDetails,
  onRefresh,
}) => {
  const [startingPrice, setStartingPrice] = useState<string>("");
  const [endDateTime, setEndDateTime] = useState<Dayjs | null>(null); // store the selected end date/time

  // Function to disable past dates (using Dayjs)
  const disablePastDates = (currentDate: Dayjs) => {
    return currentDate.isBefore(dayjs(), "day"); // Disable all dates before today
  };

  const handleStartAuction = async () => {
    if (!startingPrice || !endDateTime) {
      message.error("Please fill in all fields.");
      return;
    }

    try {
      const precision = 100000000; // This assumes 8 decimals for the token
      const startingPriceInOctas = BigInt(Math.ceil(parseFloat(startingPrice) * precision));

      const currentTime = dayjs();
      const durationInSeconds = endDateTime.diff(currentTime, "seconds"); // Calculate the difference in seconds

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::start_auction`,
        type_arguments: [],
        arguments: [
          MARKET_PLACE_ADDRESS,
          nftDetails.id.toString(),
          startingPriceInOctas.toString(),
          durationInSeconds.toString(),
        ],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("Auction started successfully!");
      setStartingPrice("");
      setEndDateTime(null);
      onClose();
      await onRefresh();
    } catch (error) {
      console.error("Error starting auction:", error);
      message.error("Failed to start auction. Please try again.");
    }
  };

  return (
    <Modal
      title="Start Auction"
      visible={isVisible}
      onCancel={onClose}
      footer={null}
    >
      <Input
        placeholder="Starting Price (in APT)"
        value={startingPrice}
        onChange={(e) => setStartingPrice(e.target.value)}
        type="number"
        style={{ marginBottom: "15px" }}
      />
      <DatePicker
        showTime
        format="YYYY-MM-DD HH:mm:ss"
        onChange={(value) => setEndDateTime(value)}
        style={{ marginBottom: "20px", width: "100%" }}
        disabledDate={disablePastDates}  // Disable past dates
      />
      <Button type="primary" block onClick={handleStartAuction}>
        Start Auction
      </Button>
    </Modal>
  );
};

export default StartAuctionModal;
