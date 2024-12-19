import React, { useState, useEffect } from "react";
import { Button, Input, Card, Spin, message, Modal, Row, Col, Typography, Tag } from "antd";
import { AptosClient } from "aptos";
import { useParams } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { MARKET_PLACE_ADDRESS, MARKET_PLACE_NAME } from "../Constants";
import { CheckOutlined, EditOutlined, DollarCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import ConfirmPurchaseModal from "../components/ConfirmPurchaseModal";
import PlaceBidModal from "../components/PlaceBidModal";
import StartAuctionModal from "../components/StartAuctionModal";
import ListForSaleModal from "../components/ListForSaleModal";
import { fetchNFTDataUtil } from "../utils/fetchNFTData";  
import { rarityColors, rarityLabels } from "../utils/rarityUtils";  

  

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
            function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::end_sale`,
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
        function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::end_auction`,
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

      </div>
    );
  }

  return (
    <div style={{ padding: '20px', display: "flex", flexDirection:"column", alignItems: "center", justifyContent: "center" }}>
       <Title level={4} style={{ marginBottom: "20px", textAlign:"center" }}>NFT Details</Title>
      {nftDetails && (
       <Card style={{ width: '100%', marginBottom: 20 }}>
       <Row gutter={[16, 16]}>
         {/* Left Column: Cover Image */}
         <Col xs={24} sm={10} md={8}>
           <img
             alt={nftDetails.name}
             src={nftDetails.uri}
             style={{ width: '100%', borderRadius: '8px' }}
           />
         </Col>
     
         {/* Right Column: Details */}
         <Col xs={24} sm={14} md={16}>
           <Title level={3}>{nftDetails.name}</Title>
           <Tag
             color={rarityColors[nftDetails.rarity]}
             style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}
           >
             {rarityLabels[nftDetails.rarity]}
           </Tag>
     
           <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}>
             <Text strong>NFT ID:</Text> {nftDetails.id}
           </Paragraph>
           <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}>
             <Text strong>Price:</Text> {auctionData ? `Auction` : `${nftDetails.price} APT`}
           </Paragraph>
           <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}>
             <Text strong>Rarity:</Text> {rarityLabels[nftDetails.rarity]}
           </Paragraph>
           <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}>
             <Text strong>For Sale:</Text> {nftDetails.for_sale ? 'Yes' : 'No'}
           </Paragraph>
           <Paragraph style={{ marginTop: '20px', fontSize: '16px', lineHeight: 1.5 }}>
             <Text strong>Description:</Text> {nftDetails.description}
           </Paragraph>
           <Paragraph style={{ marginTop: '20px', fontSize: '13px', lineHeight: 1.5 }}>
             <Text strong>Owner:</Text> {nftDetails.owner === account?.address && "You | "}{nftDetails.owner}
           </Paragraph>
     
           {auctionData && (
             <>
               <hr />
               <Title level={4}>Auction Information</Title>
               <Paragraph>
                 <Text strong>Auction End Time:</Text> {new Date(auctionData.end_time * 1000).toLocaleString()}
               </Paragraph>
               <Paragraph>
                 <Text strong>End Countdown:</Text> <span style={{ color: "red" }}>{countdown}</span>
               </Paragraph>
               <Paragraph>
                 <Text strong>Starting Bid:</Text> {auctionData.starting_price} APT
               </Paragraph>
               <Paragraph>
                 <Text strong>Highest Bid:</Text> {auctionData.highest_bid} APT
               </Paragraph>
             </>
           )}
     
           <Row gutter={16} style={{ marginTop: '20px' }}>
             <Col span={12}>
               {auctionData ? (
                 nftDetails.owner === account?.address ? (
                   <Button
                     type="primary"
                     danger
                     block
                     onClick={() => handleEndAuction(nftDetails.id)}
                     icon={<ClockCircleOutlined />}
                   >
                     End Auction
                   </Button>
                 ) : (
                   <Button
                     disabled={auctionData.isExpired}
                     type="primary"
                     block
                     onClick={() => setIsBidModalVisible(true)}
                     icon={<DollarCircleOutlined />}
                   >
                     Place Bid
                   </Button>
                 )
               ) : (
                 nftDetails.for_sale ? (
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
                   ) : (
                     <Button type="primary" onClick={() => handleBuyClick()}>
                       Buy
                     </Button>
                   )
                 ) : (
                   nftDetails.owner === account?.address && (
                     <Button
                       type="primary"
                       block
                       onClick={() => setIsListModalVisible(true)}
                       icon={<DollarCircleOutlined />}
                     >
                       List for Sale
                     </Button>
                   )
                 )
               )}
             </Col>
             <Col span={12}>
               {!auctionData ? (
                 nftDetails.owner === account?.address && (
                   <Button
                     type="primary"
                     block
                     onClick={() => setIsAuctionModalVisible(true)}
                     icon={<ClockCircleOutlined />}
                     disabled={nftDetails.for_sale}
                   >
                     Start Auction
                   </Button>
                 )
               ) : null}
             </Col>
           </Row>
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
