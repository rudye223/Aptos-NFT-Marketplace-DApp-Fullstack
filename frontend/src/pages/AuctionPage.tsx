import React, { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Button, Pagination, message } from "antd";
import { AptosClient } from "aptos";
import { MARKET_PLACE_ADDRESS } from "../Constants";
import Meta from "antd/es/card/Meta";

type Auction = {
  id: number;
  nftId: number;
  startingBid: number;
  highestBid: number;
  auctionEndTime: string;
  isActive: boolean;
};

const AuctionsPage = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [totalAuctions, setTotalAuctions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

  const pageSize = 8;

  const fetchAuctions = useCallback(async () => {
    try {
      const offset = ((currentPage - 1) * pageSize).toString(); // Convert offset to string
      const limit = pageSize.toString(); // Convert limit to string

      const auctionDataResponse = await client.view({
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::get_active_auctions`,
        arguments: [MARKET_PLACE_ADDRESS, limit, offset],
        type_arguments: [],
      });

      const auctionsList = Array.isArray(auctionDataResponse) ? auctionDataResponse : [];

      setTotalAuctions(auctionsList.length);

      if (auctionsList.length === 0) {
        console.log("No active auctions found.");
        setAuctions([]);
        return;
      }

      const auctions = auctionsList.map((auction) => {
        const [auctionId, nftId, startingBid, highestBid, auctionEndTime, isActive] = auction as [
          number,
          number,
          number,
          number,
          string,
          boolean
        ];

        return {
          id: auctionId,
          nftId,
          startingBid,
          highestBid,
          auctionEndTime,
          isActive,
        };
      });

      setAuctions(auctions);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      message.error("Failed to fetch auctions.");
    }
  }, [client, currentPage]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions, currentPage]);

  const paginatedAuctions = auctions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleJoinAuction = (auction: Auction) => {
    console.log(`Joining auction for NFT #${auction.nftId}`);
  };

  return (
    <div>
      <Row gutter={[24, 24]}>
        {paginatedAuctions.map((auction) => (
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
                <Button type="link" onClick={() => handleJoinAuction(auction)}>
                  Join Auction
                </Button>,
              ]}
            >
              <Meta
                title={`Auction for NFT #${auction.nftId}`}
                description={`Starting Bid: ${auction.startingBid} APT, Highest Bid: ${auction.highestBid} APT`}
              />
              <p>Auction End Time: {auction.auctionEndTime}</p>
              <p>Status: {auction.isActive ? "Active" : "Ended"}</p>
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
    </div>
  );
};

export default AuctionsPage;
