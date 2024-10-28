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
    return stock ? (stock["Stock Available"]) : "0"; // Ensure stock is a number
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

    if (isProductInStock =="True") {
      let estimatedDays = Number(providerInfo.TAT);
      let deliveryDate = new Date();

      if (providerInfo["Logistics Provider"] === "Provider A") {
        if (now.getHours() < 17) { // Before 5 PM
          estimate = `Same-Day Delivery (if ordered by 5 PM) and it will be delivered within ${estimatedDays} days.`;
        } else {
          deliveryDate.setDate(deliveryDate.getDate() + estimatedDays + 1);
          estimate = `Delivery within ${estimatedDays + 1} days.`;
        }
      } else if (providerInfo["Logistics Provider"] === "Provider B") {
        if (now.getHours() < 9) { // Before 9 AM
          estimate = `Same-Day Delivery (if ordered by 9 AM) and it will be delivered within ${estimatedDays} days.`;
        } else {
          deliveryDate.setDate(deliveryDate.getDate() + estimatedDays + 1);
          estimate = `Delivery within ${estimatedDays + 1} days.`;
        }
      } else {
        deliveryDate.setDate(deliveryDate.getDate() + estimatedDays); // General Partners
        estimate = `Delivery within ${estimatedDays} days.`;
      }

      // Format the delivery date
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDate = deliveryDate.toLocaleDateString(undefined, options);
      
      // Combine the estimate with the delivery date
      estimate += ` Estimated Delivery Date: ${formattedDate}.`;
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
        <View style={styles.productDetails}>
          <Text style={styles.productName}>
            {selectedProduct["Product Name"] || "Unknown Product"}
          </Text>
          <Text>Price: ₹{selectedProduct.Price || "N/A"}</Text>

          <Text>Stock: {checkStock(selectedProduct["Product ID"])}</Text>

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
