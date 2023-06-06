import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {BleManager} from 'react-native-ble-plx';

const App = () => {
  const bleManager = new BleManager();
  const [devices, setDevices] = useState([]);
  const [displayText, setDisplayText] = useState('');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [dataToSend, setDataToSend] = useState('');
  const [receivedData, setReceivedData] = useState('');

  let isScanning = false;

  useEffect(() => {
    return () => {
      bleManager.destroy();
    };
  }, []);

  const handleDiscoverDevice = (error, device) => {
    if (error) {
      console.log('Error scanning devices:', error);
      stopScan();
      return;
    }

    console.log(device.id, device.name);
    if (device.id && !devices.some(d => d.id === device.id)) {
      setDevices(prevDevices => [...prevDevices, device]);
    }
  };

  const startScan = () => {
    if (isScanning) return;
    setDisplayText('Scanning...');
    setDevices([]);
    bleManager.startDeviceScan(null, null, handleDiscoverDevice);
    isScanning = true;

    // Stop scanning after 10 seconds
    setTimeout(() => {
      stopScan();
    }, 5000);
  };

  const stopScan = () => {
    if (isScanning) {
      bleManager.stopDeviceScan();
      isScanning = false;
      setDisplayText('Scan stopped');
    }
  };

  const connectDevice = async device => {
    try {
      stopScan();
      await device.connect();
      await device.discoverAllServicesAndCharacteristics();
      setDisplayText(`Device connected\n with ${device.name}`);
      setConnectedDevice(device);
      setDevices([]);
      setupReceiveNotifications(device);
    } catch (error) {
      console.log('Error connecting to device:', error);
    }
  };

  const disconnectDevice = async () => {
    try {
      if (connectedDevice && connectedDevice.isConnected()) {
        await connectedDevice.cancelConnection();
        setConnectedDevice(null);
        setDisplayText('Device disconnected');
      }
    } catch (error) {
      console.log('Error disconnecting from device:', error);
    } finally {
      stopScan();
    }
  };

  const setupReceiveNotifications = async device => {
    const serviceUUID = 'YOUR_SERVICE_UUID'; // Replace with your service UUID
    const characteristicUUID = 'YOUR_CHARACTERISTIC_UUID'; // Replace with your characteristic UUID

    const characteristic = await device.characteristicForUUID(
      characteristicUUID,
      serviceUUID,
    );

    await characteristic.setNotifyValue(true);

    characteristic.monitor((error, characteristic) => {
      if (error) {
        console.log('Error monitoring characteristic:', error);
        return;
      }

      const receivedData = characteristic.value;
      // Process received data here
      setReceivedData(receivedData);
    });
  };

  const sendData = async () => {
    if (!connectedDevice) return;

    const serviceUUID = '000033F1-0000-1000-8000-00805F9B34FB'; // Replace with your service UUID
    const characteristicUUID = '000033F1-0000-1000-8000-00805F9B34FB'; // Replace with your characteristic UUID

    const characteristic = await connectedDevice.characteristicForUUID(
      characteristicUUID,
      serviceUUID,
    );

    const data = Buffer.from(dataToSend, 'utf-8');
    await characteristic.writeWithoutResponse(data);
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}>
        {devices.length === 0 && !connectedDevice ? (
          <View style={styles.centeredContainer}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={startScan}
              style={styles.circleView}>
              <Text style={styles.boldTextStyle}>{displayText}</Text>
            </TouchableOpacity>
          </View>
        ) : connectedDevice ? (
          <View style={styles.centeredContainer}>
            <Text style={styles.descriptionText}>
              Tap button to disconnect device.
            </Text>
            <Text style={styles.deviceName}>{connectedDevice.name}</Text>
            <View style={styles.dataContainer}>
              <Text style={styles.receivedDataTitle}>Received Data:</Text>
              <Text style={styles.receivedData}>{receivedData}</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={dataToSend}
              onChangeText={setDataToSend}
              placeholder="Enter data to send"
            />
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={sendData}
              style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={disconnectDevice}
              style={styles.circleView}>
              <Text style={styles.boldTextStyle}>{displayText}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            style={styles.deviceList}
            data={devices}
            keyExtractor={(item, index) => item.id + index.toString()}
            renderItem={({item}) => (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => connectDevice(item)}
                style={styles.deviceItem}>
                <Text style={styles.deviceName}>{item.name || item.id}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    padding: 10,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleView: {
    width: 250,
    height: 250,
    borderRadius: 150,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  boldTextStyle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  descriptionText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  deviceName: {
    color: 'black',
    fontSize: 18,
  },
  dataContainer: {
    marginBottom: 10,
  },
  receivedDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  receivedData: {
    fontSize: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  sendButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default App;
