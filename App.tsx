import React from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {useBLE} from './src/hooks/useBLE';
import {BleService} from './src/services/BleService';

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const bleService = new BleService();

  const {requestPermissions, scanForPeripherals, allDevices, connectToDevice} =
    useBLE();

  const handleScan = async () => {
    const isGranted = await bleService.checkPermissions();

    console.log(isGranted);

    if (isGranted) {
      scanForPeripherals();
    }
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? 'black' : 'white'}
      />
      <ScrollView style={{flex: 1}}>
        {allDevices.map(it => (
          <View
            key={it.id}
            style={{
              flex: 1,
              flexDirection: 'row',
              paddingHorizontal: 8,
              alignItems: 'center',
            }}>
            <View style={{flex: 1, justifyContent: 'center', paddingEnd: 8}}>
              <Text style={{flex: 1}}>{it.name}</Text>
              {it.manufacturerData && (
                <Text style={{flex: 1}}>{it.manufacturerData}</Text>
              )}
            </View>
            <Button
              title={'Connect device'}
              onPress={() => connectToDevice(it)}
            />
          </View>
        ))}
      </ScrollView>
      <View>
        <Button title={'Scan'} onPress={handleScan} />
      </View>
    </SafeAreaView>
  );
}

export default App;
