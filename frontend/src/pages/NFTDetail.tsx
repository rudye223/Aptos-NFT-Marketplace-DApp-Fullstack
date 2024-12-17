import React, { useState, useEffect } from "react";
import { Button, Input, Card, Spin, message, Modal, Row, Col, Typography, Tag } from "antd";
import { AptosClient } from "aptos";
import { useParams } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { MARKET_PLACE_ADDRESS } from "../Constants";
import { CheckOutlined, EditOutlined, DollarCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import ConfirmPurchaseModal from "../components/ConfirmPurchaseModal";
import PlaceBidModal from "../components/PlaceBidModal";
import StartAuctionModal from "../components/StartAuctionModal";
import ListForSaleModal from "../components/ListForSaleModal";
import { fetchNFTDataUtil } from "../utils/fetchNFTData";  
import { rarityColors, rarityLabels } from "../utils/rarityUtils";  

const MyNFTs: React.FC = () => {
  // Now you can use rarityColors and rarityLabels
  const nftRarity = 3; // Just an example
  const color = rarityColors[nftRarity];
  const label = rarityLabels[nftRarity];

  return (
    <div style={{ color }}>
      <h2>{label}</h2>
      {/* Render other NFT details */}
    </div>
  );
};

const { Title, Paragraph, Text } = Typography;
const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
 

const NFTDetail: React.FC = () => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const [nftDetails, setNftDetails] = useState<any>(null);
  const [auctionData, setAuctionData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const { account } = useWallet();
  const [isListModalVisible, setIsListModalVisible] = useState(false);
  
  const [isAuctionModalVisible, setIsAuctionModalVisible] = useState(false);
 
  const [isBidModalVisible, setIsBidModalVisible] = useState(false);
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [countdown, setCountdown] = useState<string>("");



  useEffect(() => {
    fetchNFTData();
  }, [tokenId, account]);

  useEffect(() => {
    if (auctionData?.end_time) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const endTime = auctionData.end_time * 1000;
        const timeLeft = endTime - now;

        if (timeLeft <= 0) {
          clearInterval(interval);
          setCountdown("Auction expired");
        } else {
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          setCountdown(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [auctionData]);

  const fetchNFTData = async () => {

    if(!tokenId) return;
    if(!account) return;
    setLoading(true);
    const data = await fetchNFTDataUtil(tokenId, account?.address, client);
    if (data) {
      setNftDetails(data);
      setAuctionData(data.auction);
    } else {
      message.error("Error fetching NFT details.");
    }
    setLoading(false);
  };
   
  const handleEndSale = async () => {
    if (!account) return;
    try {
    const entryFunctionPayload = {
            type: "entry_function_payload",
            function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::end_sale`,
            type_arguments: [],
            arguments: [MARKET_PLACE_ADDRESS, nftDetails.id.toString() ],
          };
    
          const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
          await client.waitForTransaction(response.hash);
    
          message.success("NFT sale ended successfully!");
          setNftDetails(null)

          await fetchNFTData()
        } catch (error) {
          console.error("Error ending NFT sale:", error);
          message.error("Failed to end auction.");
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
      setAuctionData(null)
      await fetchNFTData()
    } catch (error) {
      console.error("Error ending auction:", error);
      message.error("Failed to end auction.");
    }
  };
   
  const handleBuyClick = () => {

    setIsBuyModalVisible(true);
  };

if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" />
        <Title level={4} style={{ marginBottom: "20px", textAlign:"center" }}>NFT Details</Title>

      </div>
    );
  }

  return (
    <div style={{ padding: '20px', display: "flex", flexDirection:"column", alignItems: "center", justifyContent: "center" }}>
       <Title level={4} style={{ marginBottom: "20px", textAlign:"center" }}>NFT Details</Title>
      {nftDetails && (
        <Card
          title={<Title level={3}>{nftDetails.name}</Title>}
          extra={<Tag
            color={rarityColors[nftDetails.rarity]}
            style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}
          >
            {rarityLabels[nftDetails.rarity]}
          </Tag>}
          style={{ width: 430, marginBottom: 20 }}
          cover={<img alt={nftDetails.name} src={nftDetails.uri} />}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}><Text strong>NFT ID:</Text> {nftDetails.id}</Paragraph>
              <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}><Text strong>Price:</Text> {auctionData? `Auction`:`${nftDetails.price} APT`} </Paragraph>
            </Col>
            <Col span={12}>
              <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}><Text strong>Rarity:</Text> {rarityLabels[nftDetails.rarity]}</Paragraph>
              <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}><Text strong>For Sale:</Text> {nftDetails.for_sale ? 'Yes' : 'No'}</Paragraph>
            </Col>
 
          </Row>

          <Paragraph style={{ marginTop: '20px', fontSize: '16px', lineHeight: 1.5 }}>
            <Text strong >Description:</Text> {nftDetails.description}
           </Paragraph>
          <Paragraph style={{ marginTop: '20px', fontSize: '13px', lineHeight: 1.5 }}>
            <Text strong >Owner:</Text> {nftDetails.owner}
          </Paragraph>
          {auctionData && (
            <div style={{ marginBottom: 20 }}>
              <hr></hr>
              <Title level={4}>Auction Information</Title>
              <p>Auction End Time:  {new Date(auctionData.end_time * 1000).toLocaleString()}</p>
              <p>End Countdown:<span style={{ color: "red" }}> {countdown}</span></p>
              <p>Starting Bid: {auctionData.starting_price} APT</p>
              <p>Highest Bid: {auctionData.highest_bid} APT</p>
            </div>
          )}
          <Row gutter={16}>
            <Col span={12}>
              {auctionData ? (
                // If auction data exists
                nftDetails.owner === account?.address ? (
                  <Button
                    type="primary"
                    block
                    onClick={() => setIsBidModalVisible(true)} // Function to open the bid modal
                    icon={<DollarCircleOutlined />}
                  >
                    Place Bid
                  </Button>
                ) : (
                  <Button type="link">
                    Ongoing Auction
                  </Button>
                )
              ) : (
                nftDetails.for_sale ? (
                  // If for_sale is true and no auction data, show End Sale button if the user is the owner
                  nftDetails.owner === account?.address ? (
                    <Button
                      type="primary"
                      danger
                      block
                      onClick={handleEndSale}
                      icon={<DollarCircleOutlined />}
                    >
                      End Sale
                    </Button>
                  ) : <Button   type="primary" onClick={() => handleBuyClick()}>
                    Buy
                  </Button>
                ) : (
                  // If for_sale is false, show List for Sale button if the user is the owner
                  nftDetails.owner === account?.address ? (
                    <Button
                      type="primary"
                      block
                      onClick={() => setIsListModalVisible(true)}
                      icon={<DollarCircleOutlined />}
                    >
                      List for Sale
                    </Button>
                  ) : null
                )
              )}

            </Col>

            <Col span={12}>
              {
                auctionData ? (
                  // If auction data exists
                  nftDetails.owner === account?.address ? (
                    // If the user is the owner of the NFT, show the "End Auction" button
                    <Button
                      type="link"
                      danger
                      block
                      onClick={() => handleEndAuction(nftDetails.id)} // Function to end the auction
                      icon={<ClockCircleOutlined />}
                    >
                      End Auction
                    </Button>
                  ) : (
                    // If the user is not the owner, show the "Place Bid" button
                    <Button
                      type="primary"
                      block
                      onClick={() => setIsBidModalVisible(true)} // Function to open the bid modal
                      icon={<DollarCircleOutlined />}
                    >
                      Place Bid
                    </Button>
                  )
                ) : (
                  // If there is no auction data, only the owner can start the auction
                  nftDetails.owner === account?.address && (
                    <Button
                      type="primary"
                      block
                      onClick={() => setIsAuctionModalVisible(true)} // Function to start the auction
                      icon={<ClockCircleOutlined />}
                      disabled={nftDetails.for_sale}
                    >
                      Start Auction
                    </Button>
                  )
                )
              }

            </Col>

          </Row>

        </Card>
      )}


    <ListForSaleModal
        isVisible={isListModalVisible}
        onClose={() => setIsListModalVisible(false)}
        nftDetails={nftDetails}
        onRefresh={fetchNFTData}
      />
      <StartAuctionModal
        isVisible={isAuctionModalVisible}
        onClose={() => setIsAuctionModalVisible(false)}
        nftDetails={nftDetails}
        onRefresh={fetchNFTData}
      />
      <PlaceBidModal
        isVisible={isBidModalVisible}
        onClose={() => setIsBidModalVisible(false)}
        nftDetails={nftDetails}
        auction={auctionData}
        onRefresh={fetchNFTData}
      />
      <ConfirmPurchaseModal
        isVisible={isBuyModalVisible}
        onClose={() => setIsBuyModalVisible(false)}
        nftDetails={nftDetails}
        onRefresh={fetchNFTData}
      />
    </div>
  );
};

export default NFTDetail;
