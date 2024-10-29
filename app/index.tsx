import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Papa from "papaparse";
import { useFocusEffect } from "@react-navigation/native";

const App: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [pincodeData, setPincodeData] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [pincode, setPincode] = useState<string>("");
  const [deliveryEstimate, setDeliveryEstimate] = useState<string>("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [remainingTime, setRemainingTime] = useState<number>(0); // State for remaining time
  const [deliveryMessage, setDeliveryMessage] = useState<string>("");
//   let deliveryMessage: string;

  useFocusEffect(
    React.useCallback(() => {
      setDeliveryEstimate("");
      setErrorMessage("");
      setPincode("");
      setEstimatedDeliveryDate(null);
      setRemainingTime(0); // Reset remaining time
    }, [])
  );

  useEffect(() => {
    Promise.all([
      loadCSV("/Pincodes.csv", setPincodeData),
      loadCSV("/Products.csv", setProducts),
      loadCSV("/Stock.csv", setStockData),
    ]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Set up the interval to update remaining time every second
    const interval = setInterval(() => {
      if (remainingTime > 0) {
        setRemainingTime((prev) => prev - 1);
      }
    }, 1000);

    return () => clearInterval(interval); // Cleanup the interval on unmount
  }, [remainingTime]);

  const loadCSV = async (filePath: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    try {
      const response = await fetch(filePath);
      const csvText = await response.text();
      const parsedData = Papa.parse(csvText, { header: true }).data;
      setter(parsedData);
    } catch (error) {
      console.error(`Failed to load ${filePath}:`, error);
      setter([]);
    }
  };

  const getProviderAndTAT = (pincode: string) => {
    const entry = pincodeData.find((item) => item.Pincode === pincode);
    return entry || { "Logistics Provider": "N/A", TAT: "N/A" };
  };

  const checkStock = (productId: string) => {
    const stock = stockData.find((item) => item["Product ID"] === productId);
    return stock ? stock["Stock Available"] : "0";
  };

  const handlePincodeChange = (input: string) => {
    if (/^\d*$/.test(input)) {
      setPincode(input);
      setErrorMessage("");
      setDeliveryEstimate("");
    }
  };

  const calculateDeliveryDate = (estimatedDays: number): string => {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
    
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return deliveryDate.toLocaleDateString(undefined, options);
  };

  const calculateTargetDeliveryTime = (provider: string): Date => {
    const now = new Date();
    const targetTime = new Date();

    if (provider === "Provider A") {
      // Provider A: 5 PM
      targetTime.setHours(17, 0, 0, 0); // Set to 5 PM
      if (now.getTime() >= targetTime.getTime()) {
        // If it's past 5 PM, set to tomorrow
        targetTime.setDate(targetTime.getDate() + 1);
      }
    } else if (provider === "Provider B") {
      // Provider B: 9 AM
      targetTime.setHours(9, 0, 0, 0); // Set to 9 AM
      if (now.getTime() >= targetTime.getTime()) {
        // If it's past 9 AM, set to tomorrow
        targetTime.setDate(targetTime.getDate() + 1);
      }
    } else {
        targetTime.setHours(24, 0, 0, 0); // Set to 9 AM
         
        // If it's past 9 AM, set to tomorrow
        targetTime.setDate(targetTime.getDate());

    }
    return targetTime;
  };

  const checkDelivery = () => {
    if (pincode.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit pincode.");
      setDeliveryEstimate("");
      return;
    }

    const providerInfo = getProviderAndTAT(pincode);
    if (providerInfo["Logistics Provider"] === "N/A") {
      setErrorMessage("Service unavailable for this pincode.");
      setDeliveryEstimate("");
      return;
    }

    let estimate = "";
    const isProductInStock = checkStock(selectedProduct["Product ID"]) === "True";

    if (isProductInStock) {
      const targetDeliveryTime = calculateTargetDeliveryTime(providerInfo["Logistics Provider"]);
      setEstimatedDeliveryDate(targetDeliveryTime);

      const now = new Date();
      const remainingTimeInSeconds = Math.floor((targetDeliveryTime.getTime() - now.getTime()) / 1000); // Convert milliseconds to seconds
      setRemainingTime(remainingTimeInSeconds); // Set the remaining time

      let estimatedDays = Number(providerInfo.TAT);
    //   let deliveryMessage: string;

      if (providerInfo["Logistics Provider"] === "Provider A") {
        if (now.getHours() < 17) {
            const deliveryMsg = calculateDeliveryDate(estimatedDays);
            setDeliveryMessage(` ${deliveryMsg}`);
            // deliveryMessage=calculateDeliveryDate(estimatedDays);
        //   deliveryMessage = Same-Day Delivery (if ordered by 5 PM);
        } else {
            estimatedDays++;
            const deliveryMsg = calculateDeliveryDate(estimatedDays);
            setDeliveryMessage(` ${deliveryMsg}`);
            // deliveryMessage=calculateDeliveryDate(estimatedDays);
        //   deliveryMessage = Delivery within ${estimatedDays + 1} days.;
        }
      } else if (providerInfo["Logistics Provider"] === "Provider B") {
        if (now.getHours() < 9) {
            const deliveryMsg = calculateDeliveryDate(estimatedDays);
            setDeliveryMessage(` ${deliveryMsg}`);
            // deliveryMessage=calculateDeliveryDate(estimatedDays);
        //   deliveryMessage = Same-Day Delivery (if ordered by 9 AM);
        } else {
            estimatedDays++;
            const deliveryMsg = calculateDeliveryDate(estimatedDays);
            setDeliveryMessage(` ${deliveryMsg}`);
            // deliveryMessage=calculateDeliveryDate(estimatedDays);
        //   deliveryMessage = Delivery within ${estimatedDays + 1} days.;
        }
      } else {
            const deliveryMsg = calculateDeliveryDate(estimatedDays);
            setDeliveryMessage(` ${deliveryMsg}`);
        // deliveryMessage=calculateDeliveryDate(estimatedDays);
        // deliveryMessage = Delivery within ${estimatedDays} days.;
      }

    //   estimate = `Estimated Delivery Date: ${deliveryMessage}`;
    } else {
      estimate = "Out of stock";
    }

    setErrorMessage("");
    setDeliveryEstimate(estimate);
  };

  // Function to format the remaining time
  const formatRemainingTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    // const deliveryDay = estimatedDeliveryDate?.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    return seconds > 0
      ? `Order within ${hours} hrs ${minutes} mins to get it by ${deliveryMessage}`
      : `Order within ${hours} hrs ${minutes} mins to get it by ${deliveryMessage}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedProduct ? (
        <View style={styles.productDetailsContainer}>
          <View style={styles.productDetails}>
            <Text style={styles.productName}>
              {selectedProduct["Product Name"] || "Unknown Product"}
            </Text>
            <Text>Price: ₹{selectedProduct.Price || "N/A"}</Text>

            <Text>Stock: {checkStock(selectedProduct["Product ID"])}</Text>
            {checkStock(selectedProduct["Product ID"]) === "True" ? (
              <Text>Stock Available</Text>
            ) : (
              <Text>Out of Stock</Text>
            )}

            <TextInput
              placeholder="Enter Pincode"
              value={pincode}
              onChangeText={handlePincodeChange}
              keyboardType="numeric"
              maxLength={6}
              style={styles.input}
            />
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <Button title="Check Delivery" onPress={checkDelivery} />

            {deliveryEstimate && (
              <Text style={styles.estimate}>{deliveryEstimate}</Text>
            )}

            {/* Display remaining time until delivery */}
            {estimatedDeliveryDate && (
              <Text style={styles.remainingTime}>
                {formatRemainingTime(remainingTime)}
              </Text>         
            )}
          </View>

          <View style={styles.backButtonContainer}>
            <Button
              title="Back to Products"
              onPress={() => {
                setSelectedProduct(null);
                setDeliveryEstimate("");
                setErrorMessage("");
                // setPincode("");
                setEstimatedDeliveryDate(null);
                setRemainingTime(0); // Reset remaining time
              }}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) =>
            (item["Product ID"] || Math.random()).toString()
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.product}
              onPress={() => setSelectedProduct(item)}
            >
              <Text>{item["Product Name"] || "Unknown Product"}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: "#fff",
    },
    product: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#ddd",
    },
    productDetailsContainer: {
      flex: 1,
      justifyContent: "space-between",
    },
    productDetails: {
      padding: 20,
    },
    productName: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 10,
    },
    input: {
      height: 40,
      borderColor: "gray",
      borderWidth: 1,
      marginBottom: 10,
      paddingHorizontal: 10,
    },
    error: {
      color: "red",
      marginBottom: 10,
    },
    estimate: {
      marginVertical: 10,
      fontSize: 16,
      fontWeight: "bold",
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
   backButtonContainer: {
      paddingBottom: 20,
   },
  });
  
  export default App;
  
