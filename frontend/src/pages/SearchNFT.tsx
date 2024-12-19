import React, { useState, useEffect } from "react";
import { Input, Card, Spin, Row, Col, Typography, Pagination, message } from "antd";
import { AptosClient } from "aptos";
import { MARKET_PLACE_ADDRESS, MARKET_PLACE_NAME } from "../Constants";
import { useNavigate } from "react-router-dom";
import { fetchNFTDataUtil } from "../utils/fetchNFTData";
import { rarityColors, rarityLabels } from "../utils/rarityUtils";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

const { Search } = Input;
const { Title, Paragraph, Text } = Typography;
const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");


const SearchNFT: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);
  const [totalResults, setTotalResults] = useState<number>(0);
  const { account } = useWallet();

  useEffect(() => {
    if (searchTerm) {
        searchNFTs();
    } else {
        setSearchResults([])
    }
  }, [searchTerm, currentPage, pageSize]);

  const searchNFTs = async () => {
    if (!searchTerm) return;
  
    try {
       const search_term = new TextEncoder().encode(searchTerm);
       const hex_string =  Array.from(search_term)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
            console.log("hexstring::", hex_string )
      const response = await client.view({
        function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::search_nfts_by_name`,
        arguments: [MARKET_PLACE_ADDRESS,  "0x" + hex_string ], // Pass hex-encoded string
        type_arguments: [],
      });
      console.log("response::", response)
       let processedResponse = response;
        if (Array.isArray(response) && response.length === 1 && response[0] === "0") {
            processedResponse = [];
        };
        console.log("processedResponse::", processedResponse)
      if(processedResponse && processedResponse.length > 0){
        const nftPromises = processedResponse.map(async(nftId: any) => {
            return fetchNFTDataUtil(nftId[0], account?.address, client)
        })
        const nfts = await Promise.all(nftPromises);
        setTotalResults(nfts.length);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedResults = nfts.slice(startIndex, endIndex);
        setSearchResults(paginatedResults.filter(Boolean));
        
      }else {
           setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching NFTs:", error);
        message.error("Failed to search for NFTs.");
        setSearchResults([])
    }
    setLoading(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  const onPageChange = (page: number, pageSize: number) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const handleCardClick = (nftId: number) => {
    navigate(`/nft-detail/${nftId}`);
  };
  
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }
  return (
    <div style={{ padding: "20px" }}>
        <Title level={4} style={{ marginBottom: "20px", textAlign:"center" }}>Search NFTs</Title>
      <Search
        placeholder="Search NFT by name"
        value={searchTerm}
        onChange={handleSearchChange}
        style={{ marginBottom: "20px" }}
      />
       {searchResults && searchResults.length > 0 ? (
            <Row gutter={[16, 16]}>
              {searchResults.map((nft, index) => (
                <Col xs={24} sm={12} md={8} lg={6} key={index}>
                  <Card
                    hoverable
                    onClick={() => handleCardClick(nft.id)}
                    cover={
                        <img
                          alt={nft.name}
                          src={nft.uri}
                          style={{ height: "200px", objectFit: "cover" }}
                        />
                      }
                  >
                      <div style={{ display: "flex", flexDirection: "column"}}>
                    <Title level={5} style={{ marginBottom: "5px" }}>
                      {nft.name}
                    </Title>
                    <div style={{ display: "flex", alignItems:"center", justifyContent:"space-between"}}>
                     <Paragraph style={{ margin: '0px' }}>
                     </Paragraph>
                    <Typography.Text
                      style={{ fontSize: '12px', fontWeight: 'bold', margin: '5px' }}
                      type="secondary"
                      
                    >
                        <span style={{ color: rarityColors[nft.rarity]}}>{rarityLabels[nft.rarity]}</span>
                    </Typography.Text>
                    </div>
                    
                    
                    </div>
                    
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
              searchTerm && !loading && (
                  <div style={{ textAlign: "center", marginTop: "20px" }}>
                      <Text type="secondary">No results found.</Text>
                  </div>
              )
          )
        }
      {searchResults && searchResults.length > 0 && (
          <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={totalResults}
              onChange={onPageChange}
              style={{ marginTop: "20px", textAlign:"center"}}
          />
        )}
    </div>
  );
};

export default SearchNFT;