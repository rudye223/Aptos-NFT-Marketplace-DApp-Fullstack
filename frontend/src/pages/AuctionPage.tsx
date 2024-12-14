import React, { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Button, Pagination, message, Modal, Input, Form } from "antd";
import { AptosClient } from "aptos";
import { MARKET_PLACE_ADDRESS } from "../Constants";
import Meta from "antd/es/card/Meta";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

type Auction = {
  id: number;
  nftId: number;
  startingBid: number;
  highestBid: number;
  auctionEndTime: string;
  nftMetadata: {
    name: string;
    imageUrl: string;
    description: string;
    rarity: number;
    price: number;
    forSale: boolean;
    owner: string; // Added owner field
  };
};

const AuctionsPage = () => {
  const { account } = useWallet();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [totalAuctions, setTotalAuctions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);

  const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
  const pageSize = 8;

  const fetchNFTDetails = async (id: number) => {
    try {
      const nftDetails = await client.view({
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::get_nft_details_current`,
        arguments: [MARKET_PLACE_ADDRESS, id],
        type_arguments: [],
      });
      console.log("raw::", nftDetails )
      const [nftId, owner, name, description, uri, price, forSale, rarity] = nftDetails as [
        number,
        string,
        string,
        string,
        string,
        number,
        boolean,
        number
      ];

      const hexToUint8Array = (hexString: string): Uint8Array => {
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
          bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
        }
        return bytes;
      };

      return {
        id: nftId,
        name: new TextDecoder().decode(hexToUint8Array(name.slice(2))),
        description: new TextDecoder().decode(hexToUint8Array(description.slice(2))),
        imageUrl: new TextDecoder().decode(hexToUint8Array(uri.slice(2))),
        rarity,
        price: price / 100000000,
        forSale,
        owner,
      };
    } catch (error) {
      console.error("Error fetching NFT details:", error);
      return null;
    }
  };

  const fetchAuctions = useCallback(async () => {
    try {
      const offset = ((currentPage - 1) * pageSize).toString();
      const limit = pageSize.toString();

      const auctionDataResponse = await client.view({
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::get_active_auctions`,
        arguments: [MARKET_PLACE_ADDRESS, limit, offset],
        type_arguments: [],
      });

      const auctionsList = Array.isArray(auctionDataResponse[0]) ? auctionDataResponse[0] : [];
      setTotalAuctions(auctionsList.length);

      if (auctionsList.length === 0) {
        setAuctions([]);
        return;
      }

      const auctionPromises = auctionsList.map(async (auction: any) => {
        const { nft_id, starting_price, highest_bid, highest_bidder, end_time } = auction;

        const nftMetadata = await fetchNFTDetails(nft_id);

        return {
          id: nft_id,
          nftId: nft_id,
          startingBid: starting_price / 100000000,
          highestBid: highest_bid / 100000000,
          auctionEndTime: new Date(parseInt(end_time, 10) * 1000).toLocaleString(),
          nftMetadata: nftMetadata || {
            name: "Unknown",
            imageUrl: "",
            description: "No description",
            rarity: 0,
            price: 0,
            forSale: false,
            owner: "",
          },
        };
      });

      const auctionsWithMetadata = await Promise.all(auctionPromises);
      setAuctions(auctionsWithMetadata);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      message.error("Failed to fetch auctions.");
    }
  }, [currentPage, account]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions, currentPage]);

  const showModal = (auction: Auction) => {
    setSelectedAuction(auction);
    setIsModalVisible(true);
  };

  const handlePlaceBid = async (values: any) => {
    if (!account) return;
    if (!selectedAuction) return;

    const { bidAmount } = values;

    if (bidAmount <= selectedAuction.highestBid) {
      message.error("Bid amount must be higher than the current highest bid.");
      return;
    }

    try {
      const bidInOctas = parseFloat(bidAmount) * 100000000;
      const entryFunctionPayload = {
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::place_bid`,
        type_arguments: [],
        arguments: [MARKET_PLACE_ADDRESS, selectedAuction.nftId, bidInOctas],
      };

      const txnResponse = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      console.log("Transaction Response:", txnResponse);
      await client.waitForTransaction(txnResponse.hash);
      message.success(`Bid placed successfully!`);
      setIsModalVisible(false);
      fetchAuctions();
    } catch (error) {
      console.error("Error placing bid:", error);
      message.error("Failed to place bid.");
    }
  };

  const handleEndAuction = async (nftId: number) => {
    if (!account) return;

    try {
      const entryFunctionPayload = {
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::end_auction`,
        type_arguments: [],
        arguments: [MARKET_PLACE_ADDRESS, nftId],
      };

      const txnResponse = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      console.log("Transaction Response:", txnResponse);
      await client.waitForTransaction(txnResponse.hash);
      message.success(`Auction ended successfully!`);
      fetchAuctions();
    } catch (error) {
      console.error("Error ending auction:", error);
      message.error("Failed to end auction.");
    }
  };

  return (
    <div>
      <Row gutter={[24, 24]}>
        {auctions.map((auction) => (
          <Col key={auction.id} xs={24} sm={12} md={8} lg={8} xl={6}>
            <Card
              hoverable
              style={{
                width: "100%",
                maxWidth: "280px",
                minWidth: "220px",
                margin: "0 auto",
              }}
              actions={[
                <Button type="link" onClick={() => showModal(auction)}>
                  Place Bid
                </Button>,
                auction.nftMetadata.owner === account?.address && (
                  <Button
                    type="link"
                    danger
                    onClick={() => handleEndAuction(auction.nftId)}
                  >
                    End Auction
                  </Button>
                ),
              ]}
            >
              {auction.nftMetadata.imageUrl && (
                <img
                  src={auction.nftMetadata.imageUrl}
                  alt={auction.nftMetadata.name}
                  style={{ width: "100%", height: "auto" }}
                />
              )}
              <div>
                <h4>Auction Details:</h4>
                <p>Auction End Time: {auction.auctionEndTime}</p>
                <p>Starting Bid: {auction.startingBid} APT</p>
                <p>Highest Bid: {auction.highestBid} APT</p>
              </div>
              <div>
                <h4>NFT Details:</h4>
                <p>{auction.nftMetadata.description}</p>
                <p>Rarity: {auction.nftMetadata.rarity}</p>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={totalAuctions}
          onChange={(page) => setCurrentPage(page)}
          style={{ display: "flex", justifyContent: "center" }}
        />
      </div>

      <Modal
        title="Place Your Bid"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handlePlaceBid}>
          <Form.Item name="bidAmount" label="Bid Amount">
            <Input placeholder="Enter bid amount" type="number" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
              Place Bid
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AuctionsPage;
