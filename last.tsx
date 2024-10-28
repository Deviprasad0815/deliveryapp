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

const App = () => {
  const [products, setProducts] = useState([]);
  const [pincodeData, setPincodeData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pincode, setPincode] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
//   let abc;

  // Load CSV files on mount
  useEffect(() => {
    Promise.all([
      loadCSV("/Pincodes.csv", setPincodeData),
      loadCSV("/Products.csv", setProducts),
      loadCSV("/Stock.csv", setStockData),
    ]).then(() => setLoading(false));
  }, []);

  // Helper function to load CSV and parse it
  const loadCSV = async (filePath, setter) => {
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
  const getProviderAndTAT = (pincode) => {
    const entry = pincodeData.find((item) => item.Pincode === pincode);
    return entry || { "Logistics Provider": "N/A", TAT: "N/A" };
  };

  // Check stock availability of the selected product
  const checkStock = (productId) => {
    const stock = stockData.find((item) => item["Product ID"] === productId);
    return stock ? stock["Stock Available"] : "0";
  };

  // Handle changes to the pincode input
  const handlePincodeChange = (input) => {
    if (/^\d*$/.test(input)) {
      setPincode(input);
      setErrorMessage("");
      setDeliveryEstimate("");
    }
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
    // console.log(isProductInStock);
    
//    if(checkStock(selectedProduct["Product ID"])){
//     abc=true;
//   }else{
//     abc=false;
//   }

    if(isProductInStock == "True"){
    if (providerInfo["Logistics Provider"] === "Provider A") {
        console.log(now.getDate());
      if (now.getHours() < 17 && isProductInStock) {
        estimate = `Same-Day Delivery (if ordered by 5 PM) and it will be Deliver within ${providerInfo.TAT} days`;
      } else {
        const d = Number(providerInfo.TAT) + 1;
        estimate = `Delivery within ${d} days`;
      }
    } else if (providerInfo["Logistics Provider"] === "Provider B") {
        console.log(now.getDate());
      if (now.getHours() < 9) {
        estimate = `Same-Day Delivery (if ordered by 9 AM) and it will be Deliver within ${providerInfo.TAT} days`;
      } else {
        const e = Number(providerInfo.TAT) + 1;
        estimate = `Delivery within ${e} days`;
        // estimate = "Next-Day Delivery";
      }
    } else {
        console.log(now.getDate());
      // General Partners (non-specific logic for metro, non-metro, or tier 2-3)
      estimate = `Delivery within ${providerInfo.TAT} days`;
    }
}else {
    estimate = `out of stock`;
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
        <View style={styles.productDetails}>
          <Text style={styles.productName}>
            {selectedProduct["Product Name"] || "Unknown Product"}
          </Text>
          <Text>Price: ₹{selectedProduct.Price || "N/A"}</Text>

          <Text>Stock: {checkStock(selectedProduct["Product ID"])}</Text>

          {/* {abc ? (
    <Text>Stock Available</Text>
) : (
    <Text>Out of Stock</Text>
)} */}
        
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

          <Button
            title="Back to Products"
            onPress={() => setSelectedProduct(null)}
          />
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
});

export default App;
