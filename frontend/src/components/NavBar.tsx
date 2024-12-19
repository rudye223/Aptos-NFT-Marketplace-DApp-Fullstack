import React, { useEffect, useState } from "react";
import {
  Layout,
  Typography,
  Menu,
  Space,
  Button,
  Dropdown,
  message,
  Avatar,
} from "antd";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AptosClient } from "aptos";
import {
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";

const { Header } = Layout;
const { Text } = Typography;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");


interface NavBarProps {
  onMintNFTClick: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onMintNFTClick }) => {
    const { connected, account, network, disconnect } = useWallet();
    const [balance, setBalance] = useState<number | null>(null);
    const location = useLocation();
    const [selectedKey, setSelectedKey] = useState<string>("/");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        setSelectedKey(location.pathname);
    }, [location.pathname]);

    useEffect(() => {
        const fetchBalance = async () => {
            if (account) {
                try {
                    const resources: any[] = await client.getAccountResources(
                        account.address
                    );
                    const accountResource = resources.find(
                        (r) =>
                            r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
                    );
                    if (accountResource) {
                        const balanceValue = (accountResource.data as any).coin.value;
                        setBalance(balanceValue ? parseInt(balanceValue) / 100000000 : 0);
                    } else {
                        setBalance(0);
                    }
                } catch (error) {
                    console.error("Error fetching balance:", error);
                }
            }
        };

        if (connected) {
            fetchBalance();
        }
    }, [account, connected]);

    const handleLogout = async () => {
        try {
            await disconnect();
            setBalance(null);
            message.success("Disconnected from wallet");
        } catch (error) {
            console.error("Error disconnecting wallet:", error);
            message.error("Failed to disconnect from wallet");
        }
    };
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const menuItems = [
        { key: "/", label: <Link to="/" style={{ color: '#000', fontWeight: 500 }}>Marketplace</Link> },
        { key: "/analytics", label: <Link to="/analytics" style={{ color: '#000', fontWeight: 500 }}>Analytics</Link> },
        {
            key: "/my-nfts",
            label: <Link to="/my-nfts" style={{ color: '#000', fontWeight: 500 }}>My Collection</Link>,
        },
        { key: "/auctions", label: <Link to="/auctions" style={{ color: '#000', fontWeight: 500 }}>Auctions</Link> },
        { key: "/transfer", label: <Link to="/transfer" style={{ color: '#000', fontWeight: 500 }}>Transfer</Link> },
        { key: "/search", label: <Link to="/search" style={{ color: '#000', fontWeight: 500 }}>Search</Link> },
        { key: "/chats", label: <Link to="/chats" style={{ color: '#000', fontWeight: 500 }}>Chats</Link> },
        { key: "/mint-nft", label: <span onClick={onMintNFTClick} style={{ color: '#000', fontWeight: 500 }}>Mint NFT</span> },
    ];

    return (
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#fff", // White background
          padding: "0 20px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Subtle shadow for depth
        }}
      >
        {/* Logo and Navigation */}
        <div style={{ display: "flex", alignItems: "center" }}>
            <img
                src="/Aptos_Primary_WHT.png"
                alt="Aptos Logo"
                style={{ height: "40px", marginRight: 20,
                   backgroundColor:" #29a3d5" ,
                  //  backgroundColor:"#1677ff"  
                  }}
            />
            {/* Desktop Menu */}
            <Menu
                theme="light"
                mode="horizontal"
                selectedKeys={[selectedKey]}
                style={{ backgroundColor: "transparent", border: "none" }}
                className="desktop-menu"
            >
                {menuItems.map((item) => (
                  <Menu.Item
                    key={item.key}
                    style={{
                      color: "#000",
                      fontWeight: "500",
                    }}
                  >
                    {item.label}
                  </Menu.Item>
                ))}
            </Menu>
            {/* Hamburger menu for mobile devices */}
            <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={toggleMenu}
                style={{ color: "#000" , display: 'none'}}
                className="mobile-menu-button"
            />
            {/* Mobile menu dropdown */}
            {isMenuOpen && (
                <div
                    className="mobile-menu-dropdown"
                     style={{
                        position: 'absolute',
                        top: '60px',
                        left: 0,
                        backgroundColor: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        padding: '10px',
                        border: '1px solid #f0f0f0',
                        width: '100%',
                        textAlign:"center"
                    }}
                >
                    <Menu
                      theme="light"
                      mode="vertical"
                      selectedKeys={[selectedKey]}
                      style={{ backgroundColor: "transparent", border: "none" }}
                         onClick={()=> setIsMenuOpen(false)}
                    >
                        {menuItems.map((item) => (
                          <Menu.Item
                            key={item.key}
                            style={{
                              color: "#000",
                              fontWeight: "500",
                            }}
                          >
                            {item.label}
                          </Menu.Item>
                        ))}
                    </Menu>
                </div>
            )}
        </div>
        {/* User Wallet Section */}
        <Space style={{ alignItems: "center" }}>
            {connected && account ? (
                <Dropdown
                    overlay={
                        <Menu>
                          <Menu.Item key="address">
                            <Text style={{ fontWeight: "bold" }}>Address:</Text>
                            <Text copyable>{account.address}</Text>
                          </Menu.Item>
                          <Menu.Item key="network">
                            <Text style={{ fontWeight: "bold" }}>Network:</Text>{" "}
                            {network ? network.name : "Unknown"}
                          </Menu.Item>
                          <Menu.Item key="balance">
                            <Text style={{ fontWeight: "bold" }}>Balance:</Text>{" "}
                            {balance !== null ? `${balance} APT` : "Loading..."}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            key="logout"
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                          >
                            Log Out
                          </Menu.Item>
                        </Menu>
                    }
                    trigger={["click"]}
                >
                    <Button
                        type="text"
                        style={{
                            color: "#000",
                            display: "flex",
                            alignItems: "center",
                        }}
                        icon={
                            <Avatar
                                style={{
                                    backgroundColor: "#1677ff",
                                    color: "white",
                                    marginRight: "5px",
                                }}
                                size="small"
                                icon={<UserOutlined />}
                            />
                        }
                    >
                         <span
                            style={{
                                fontWeight: 500,
                                color: "#000",
                            }}
                           >Connected</span>
                    </Button>
                </Dropdown>
            ) : (
                <WalletSelector />
            )}
        </Space>
        <style jsx>{`
      .desktop-menu {
        display: none; /* Initially hidden on smaller screens */
      }
      .mobile-menu-button {
           display: flex; /* Initially visible on smaller screens */
      }
       @media (min-width: 768px) {
          .desktop-menu {
            display: flex !important;
          }
            .mobile-menu-button {
            display: none !important;
           }
       }
    `}</style>
      </Header>
    );
};

export default NavBar;