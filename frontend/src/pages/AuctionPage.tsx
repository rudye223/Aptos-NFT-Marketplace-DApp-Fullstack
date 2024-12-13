import React, { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Button, Pagination, message } from "antd";
import { AptosClient } from "aptos";
import { MARKET_PLACE_ADDRESS } from "../Constants";
import Meta from "antd/es/card/Meta";

// Update the Auction type to include the expected nftMetadata structure
type Auction = {
  id: number;
  nftId: number;
  startingBid: number;
  highestBid: number;
  auctionEndTime: string;
  isActive: boolean;
  nftMetadata: {
    name: string;
    imageUrl: string;
    description: string;
    rarity: number;
    price: number;
    forSale: boolean;
  };
};

const AuctionsPage = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [totalAuctions, setTotalAuctions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

  const pageSize = 8;

  const fetchNFTDetails = async (id: number) => {
    // Fetch NFT details using the nftId
    try {
      const nftDetails = await client.view({
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::get_nft_details`,
        arguments: [MARKET_PLACE_ADDRESS, id],
        type_arguments: [],
      });
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
        price: price / 100000000, // Convert octas to APT
        forSale,
      };
    } catch (error) {
      console.error("Error fetching NFT details:", error);
      return null; // Return null if metadata fetch fails
    }
  };

  const fetchAuctions = useCallback(async () => {
    try {
      const offset = ((currentPage - 1) * pageSize).toString(); // Convert offset to string
      const limit = pageSize.toString(); // Convert limit to string

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

        // Fetch NFT details for the current auction
        const nftMetadata = await fetchNFTDetails(nft_id);
        
        return {
          id: nft_id, // Using nft_id as auction ID
          nftId: nft_id,
          startingBid: parseInt(starting_price, 10),
          highestBid: parseInt(highest_bid, 10),
          auctionEndTime: new Date(parseInt(end_time, 10) * 1000).toLocaleString(), // Convert Unix timestamp to date
          isActive: parseInt(highest_bid, 10) === 0 ? true : false, // Set auction as active if no bids
          nftMetadata: nftMetadata || { name: "Unknown", imageUrl: "", description: "No description", rarity: 0, price: 0, forSale: false },
        };
      });

      // Wait for all NFT details fetches to complete
      const auctionsWithMetadata = await Promise.all(auctionPromises);
      setAuctions(auctionsWithMetadata);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      message.error("Failed to fetch auctions.");
    }
  }, [ currentPage]);

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
                title={`Auction for ${auction.nftMetadata.name}`}
                description={`Starting Bid: ${auction.startingBid} APT, Highest Bid: ${auction.highestBid} APT`}
              />
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
                {/* <p>Status: {auction.isActive ? "Active" : "Ended"}</p> */}
                <p>Starting Bid: {auction.startingBid} APT</p>
                <p>Highest Bid: {auction.highestBid} APT</p>
              </div>
              <div>
                <h4>NFT Details:</h4>
                <p>{auction.nftMetadata.description}</p>
                <p>Rarity: {auction.nftMetadata.rarity}</p>
                <p>Price: {auction.nftMetadata.price} APT</p>
                <p>For Sale: {auction.nftMetadata.forSale ? "Yes" : "No"}</p>
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
    </div>
  );
};

export default AuctionsPage;
