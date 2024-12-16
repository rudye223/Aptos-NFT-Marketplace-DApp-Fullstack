import React, { useEffect, useState, useCallback } from "react";
import { Typography, Card, Row, Col, Pagination, message, Button, Input, Modal } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { MARKET_PLACE_ADDRESS } from "../Constants";
const { Title } = Typography;
const { Meta } = Card;
import { useNavigate } from "react-router-dom";
import StartAuctionModal from "../components/StartAuctionModal";
import ListForSaleModal from "../components/ListForSaleModal";

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

   

  useEffect(() => {
    fetchUserNFTs();
  }, [fetchUserNFTs, currentPage]);

  const handleSellClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsModalVisible(true);
  };

  const handleAuctionClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsAuctionModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedNft(null);
  };
  const handleAuctionModalClose = () => {
    setIsAuctionModalVisible(false);
    setSelectedNft(null);
  };
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
                  <Button type="link"  onClick={() => navigate(`/nft-detail/${nft.id}`)}>
                    Ongoing Auction
                  </Button>
                ) : nft.for_sale ? (
                  <Button type="link"  onClick={() => navigate(`/nft-detail/${nft.id}`)}>
                    Ongoing Sale
                  </Button>
                ) : (
                  <>
                    <Button type="link" onClick={() => handleSellClick(nft)}>
                      Sell
                    </Button>
                    <Button type="link" onClick={() => handleAuctionClick(nft)}>
                      Auction
                    </Button>
                  </>
                )
              ]}
              
            >
              <div onClick={() => navigate(`/nft-detail/${nft.id}`)}>
              <Meta 
              title={nft.name} description={`Rarity: ${nft.rarity}, Price: ${nft.price} APT`} />
              <p>ID: {nft.id}</p>
              <p>{nft.description}</p>
              {nft.auction ?(
                  <p style={{ margin: "10px 0" }}>For Sale: Auction</p>
              ):(
                <p style={{ margin: "10px 0" }}>For Sale: {nft.for_sale? "Yes" : "No"}</p>
              )}
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
  
      {selectedNft && (
        <ListForSaleModal
          isVisible={isModalVisible}
          onClose={handleModalClose}
          nftDetails={selectedNft}
          onRefresh={fetchUserNFTs}
        />
      )}
      {selectedNft && (
        <StartAuctionModal
          isVisible={isAuctionModalVisible}
          onClose={handleAuctionModalClose}
          nftDetails={selectedNft}
          onRefresh={fetchUserNFTs}
        />
      )}
    </div>
  );
};

export default MyNFTs;
