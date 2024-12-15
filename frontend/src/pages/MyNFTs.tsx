import React, { useEffect, useState, useCallback } from "react";
import { Typography, Card, Row, Col, Pagination, message, Button, Input, Modal } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { MARKET_PLACE_ADDRESS } from "../Constants";
const { Title } = Typography;
const { Meta } = Card;
import { useNavigate } from "react-router-dom";

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

type NFT = {
  id: number;
  name: string;
  description: string;
  uri: string;
  rarity: number;
  price: number;
  for_sale: boolean;
  auction: { 
    starting_bid: number; 
    duration: number; 
    end_time: number;
  } | null;
};

const MyNFTs: React.FC = () => {
  const pageSize = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [totalNFTs, setTotalNFTs] = useState(0);
  const { account, signAndSubmitTransaction } = useWallet();
  const navigate= useNavigate()
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAuctionModalVisible, setIsAuctionModalVisible] = useState(false); // Auction modal
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [salePrice, setSalePrice] = useState<string>("");
  const [startingBid, setStartingBid] = useState<string>(""); // Starting bid for auction
  const [auctionDuration, setAuctionDuration] = useState<string>(""); // Auction duration

  const fetchUserNFTs = useCallback(async () => {
    if (!account) return;

    try {
      console.log("Fetching NFT IDs for owner:", account.address);

      const nftIdsResponse = await client.view({
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::get_all_nfts_for_owner`,
        arguments: [MARKET_PLACE_ADDRESS, account.address, "100", "0"],
        type_arguments: [],
      });
  
      const nftIds = Array.isArray(nftIdsResponse[0]) ? nftIdsResponse[0] : nftIdsResponse;
      setTotalNFTs(nftIds.length);

      if (nftIds.length === 0) {
        console.log("No NFTs found for the owner.");
        setNfts([]);
        return;
      }

      console.log("Fetching details for each NFT ID:", nftIds);

      const userNFTs = (await Promise.all(
        nftIds.map(async (id) => {
          try {
            const nftDetails = await client.view({
              function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::get_nft_details_current`,
              arguments: [MARKET_PLACE_ADDRESS, id],
              type_arguments: [],
            });
            console.log("raw::", nftDetails)
            const auc= nftDetails[8]
            const auc_2=  auc['vec']
             const auction = auc_2[0] 
             console.log("auction", auction )
            
            const [nftId, owner, name, description, uri, price, forSale, rarity ] = nftDetails as [
              number,
              string,
              string,
              string,
              string,
              number,
              boolean,
              number,
              
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
              uri: new TextDecoder().decode(hexToUint8Array(uri.slice(2))),
              rarity,
              price: price / 100000000, // Convert octas to APT
              for_sale: forSale,
              auction:auction,
            };
          } catch (error) {
            console.error(`Error fetching details for NFT ID ${id}:`, error);
            return null;
          }
        })
      )).filter((nft): nft is NFT => nft !== null);

      console.log("User NFTs:", userNFTs);
      setNfts(userNFTs);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      message.error("Failed to fetch your NFTs.");
    }
  }, [account, MARKET_PLACE_ADDRESS]);

  const handleSellClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsModalVisible(true);
  };

  const handleAuctionClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsAuctionModalVisible(true); // Open auction modal
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedNft(null);
    setSalePrice("");
  };

  const handleAuctionCancel = () => {
    setIsAuctionModalVisible(false);
    setSelectedNft(null);
    setStartingBid("");
    setAuctionDuration("");
  };

  const handleConfirmListing = async () => {
    if (!selectedNft || !salePrice) return;
  
    try {
      const precision = 100000000; // This assumes 8 decimals for the token

      // Step 2: Scale the  amount to avoid floating point precision issues
      const priceInOctas = BigInt(Math.ceil(parseFloat(salePrice) * precision));
      
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::list_for_sale`,
        type_arguments: [],
        arguments: [MARKET_PLACE_ADDRESS, selectedNft.id.toString(), priceInOctas.toString()],
      };
  
      // Bypass type checking
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      message.success("NFT listed for sale successfully!");
      setIsModalVisible(false);
      setSalePrice("");
      fetchUserNFTs();
    } catch (error) {
      console.error("Error listing NFT for sale:", error);
      message.error("Failed to list NFT for sale.");
    }
  };

  const handleConfirmAuction = async () => {
    if (!selectedNft || !startingBid || !auctionDuration) return;

    try {
      const precision = 100000000; // This assumes 8 decimals for the token

      // Step 2: Scale the bid amount to avoid floating point precision issues
      const bidInOctas = BigInt(Math.ceil(parseFloat(startingBid) * precision));
      

     
      const durationInSeconds = parseInt(auctionDuration);

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::start_auction`,
        type_arguments: [],
        arguments: [
          MARKET_PLACE_ADDRESS, 
          selectedNft.id.toString(), 
          bidInOctas.toString(),
          durationInSeconds.toString(),
        ],
      };
  
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      message.success("Auction started successfully!");
      setIsAuctionModalVisible(false);
      setStartingBid("");
      setAuctionDuration("");
      fetchUserNFTs();
    } catch (error) {
      console.error("Error starting auction:", error);
      message.error("Failed to start auction.");
    }
  };

  useEffect(() => {
    fetchUserNFTs();
  }, [fetchUserNFTs, currentPage]);

  const paginatedNFTs = nfts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Title level={2} style={{ marginBottom: "20px" }}>My Collection</Title>
      <p>Your personal collection of NFTs.</p>
  
      {/* Card Grid */}
      <Row
        gutter={[24, 24]}
        style={{
          marginTop: 20,
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {paginatedNFTs.map((nft) => (
          <Col
            key={nft.id}
            xs={24} sm={12} md={8} lg={8} xl={6}
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Card
              hoverable
              style={{
                width: "100%",
                maxWidth: "280px",
                minWidth: "220px",
                margin: "0 auto",
              }}
             
              cover={<img alt={nft.name} src={nft.uri} />}
              actions={[
                nft.auction ? (
             <></>
                ) : ( 
                <Button type="link" onClick={() => handleSellClick(nft)}>
                Sell
              </Button>
                )
               ,
                nft.auction ? (
                  <Button type="link" >
                    Ongoing Auction
                  </Button>
                ) : (
                  <Button type="link" onClick={() => handleAuctionClick(nft)}>
                    Auction
                  </Button>
                )
              ]}
            >
              <div onClick={() => navigate(`/nft-detail/${nft.id}`)}>
              <Meta 
              title={nft.name} description={`Rarity: ${nft.rarity}, Price: ${nft.price} APT`} />
              <p>ID: {nft.id}</p>
              <p>{nft.description}</p>
              <p style={{ margin: "10px 0" }}>For Sale: {nft.for_sale? "Yes" : "No"}</p>
              {nft.auction && <p>Auction Ending: {new Date(nft.auction.end_time * 1000).toLocaleString()}</p>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
  
      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={totalNFTs}
          onChange={(page) => setCurrentPage(page)}
          style={{ display: "flex", justifyContent: "center" }}
        />
      </div>
  
      <Modal
        title="Sell NFT"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmListing}>
            Confirm Listing
          </Button>,
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>NFT ID:</strong> {selectedNft.id}</p>
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <p><strong>Description:</strong> {selectedNft.description}</p>
            <p><strong>Rarity:</strong> {selectedNft.rarity}</p>
            <p><strong>Current Price:</strong> {selectedNft.price} APT</p>
  
            <Input
              type="number"
              placeholder="Enter sale price in APT"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </Modal>

      {/* Auction Modal */}
      <Modal
        title="Start Auction"
        visible={isAuctionModalVisible}
        onCancel={handleAuctionCancel}
        footer={[
          <Button key="cancel" onClick={handleAuctionCancel}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmAuction}>
            Start Auction
          </Button>,
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>NFT ID:</strong> {selectedNft.id}</p>
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <p><strong>Description:</strong> {selectedNft.description}</p>
            <p><strong>Rarity:</strong> {selectedNft.rarity}</p>
            <p><strong>Current Price:</strong> {selectedNft.price} APT</p>
  
            <Input
              type="number"
              placeholder="Enter starting bid in APT"
              value={startingBid}
              onChange={(e) => setStartingBid(e.target.value)}
              style={{ marginTop: 10 }}
            />
  
            <Input
              type="number"
              placeholder="Enter auction duration in seconds"
              value={auctionDuration}
              onChange={(e) => setAuctionDuration(e.target.value)}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default MyNFTs;
