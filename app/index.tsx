import React, { useState, useEffect } from "react";

// const App: React.FC = () => {
//   const [deliveryEstimate, setDeliveryEstimate] = useState<string>("");

//   useFocusEffect(
//     React.useCallback(() => {
//       // Clear delivery estimate each time the screen is focused
//       setDeliveryEstimate("");
//     }, [])
//   );


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
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

//   const [deliveryEstimate, setDeliveryEstimate] = useState<string>("");

  useFocusEffect(
    React.useCallback(() => {
      // Clear delivery estimate each time the screen is focused
      setDeliveryEstimate("");
      setErrorMessage("");
      setPincode("");
    }, [])
  );

  // Load CSV files on mount
  useEffect(() => {
    Promise.all([
      loadCSV("/Pincodes.csv", setPincodeData),
      loadCSV("/Products.csv", setProducts),
      loadCSV("/Stock.csv", setStockData),
    ]).then(() => setLoading(false));
  }, []);

  // Helper function to load CSV and parse it
  const loadCSV = async (filePath: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    try {
      const response = await fetch(filePath);
      const csvText = await response.text();
      const parsedData = Papa.parse(csvText, { header: true }).data;
      setter(parsedData);
    } catch (error) {
      console.error(`Failed to load ${filePath}:`, error);
      setter([]); // Set to an empty array on failure
    }
  };

  // Get delivery provider and TAT based on the entered pincode
  const getProviderAndTAT = (pincode: string) => {
    const entry = pincodeData.find((item) => item.Pincode === pincode);
    return entry || { "Logistics Provider": "N/A", TAT: "N/A" };
  };

  // Check stock availability of the selected product
  const checkStock = (productId: string) => {
    const stock = stockData.find((item) => item["Product ID"] === productId);
    return stock ? stock["Stock Available"] : "0"; // Ensure stock is a number
  };

  // Handle changes to the pincode input
  const handlePincodeChange = (input: string) => {
    if (/^\d*$/.test(input)) {
      setPincode(input);
      setErrorMessage("");
      setDeliveryEstimate("");
    }
  };

  // Calculate the delivery date based on current date and estimated days
  const calculateDeliveryDate = (estimatedDays: number): string => {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
    
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return deliveryDate.toLocaleDateString(undefined, options);
  };

  // Check delivery availability and estimate based on pincode
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

    const now = new Date();
    let estimate = "";

    // Check stock for the selected product
    const isProductInStock = checkStock(selectedProduct["Product ID"]);

    if (isProductInStock == "True") {
      let estimatedDays = Number(providerInfo.TAT);
      let deliveryMessage: string;

      if (providerInfo["Logistics Provider"] === "Provider A") {
        if (now.getHours() < 17) {
            deliveryMessage=calculateDeliveryDate(estimatedDays);
        //   deliveryMessage = `Same-Day Delivery (if ordered by 5 PM)`;
        } else {
            estimatedDays++;
            deliveryMessage=calculateDeliveryDate(estimatedDays);
        //   deliveryMessage = `Delivery within ${estimatedDays + 1} days.`;
        }
      } else if (providerInfo["Logistics Provider"] === "Provider B") {
        if (now.getHours() < 9) {
            deliveryMessage=calculateDeliveryDate(estimatedDays);
        //   deliveryMessage = `Same-Day Delivery (if ordered by 9 AM)`;
        } else {
            estimatedDays++;
            deliveryMessage=calculateDeliveryDate(estimatedDays);
        //   deliveryMessage = `Delivery within ${estimatedDays + 1} days.`;
        }
      } else {
        deliveryMessage=calculateDeliveryDate(estimatedDays);
        // deliveryMessage = `Delivery within ${estimatedDays} days.`;
      }

      // Calculate delivery date
    //   const deliveryDateString = calculateDeliveryDate(
    //     deliveryMessage.includes('Same-Day') ? 0 : estimatedDays + (providerInfo["Logistics Provider"] === "Provider A" && now.getHours() >= 17 ? 1 : 0)
    //   );

      estimate = ` Estimated Delivery Date: ${deliveryMessage}.`;
      
    } else {
      estimate = "Out of stock";
    }

    setErrorMessage("");
    setDeliveryEstimate(estimate);
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
          {checkStock(selectedProduct["Product ID"]) == "True" ? (
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
        </View>


        <View style={styles.backButtonContainer}>
          <Button
            title="Back to Products"
            onPress={() => {
                setSelectedProduct(null);
                setDeliveryEstimate("");
                setErrorMessage("");
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
