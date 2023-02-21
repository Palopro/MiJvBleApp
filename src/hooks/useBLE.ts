import {PermissionsAndroid, Platform} from 'react-native';
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
} from 'react-native-ble-plx';
import {useState} from 'react';
import {atob, toByteArray} from 'react-native-quick-base64';
import DeviceInfo from 'react-native-device-info';

const bleManager = new BleManager();

type PermissionCallback = (result: boolean) => void;

interface BluetoothLE {
  requestPermissions: (callback: PermissionCallback) => Promise<void>;
  scanForPeripherals: () => void;
  connectToDevice: (device: Device) => Promise<void>;
  disconnectFromDevice: () => void;
  allDevices: Array<Device>;
  temperature: number;
  humidity: number;
}

export function useBLE(): BluetoothLE {
  const [allDevices, setDevices] = useState<Array<Device>>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  const [temperature, setTemperature] = useState<number>(0);
  const [humidity, setHumidity] = useState<number>(0);

  const requestPermissions = async (callback: PermissionCallback) => {
    if (Platform.OS === 'android') {
      const apiLevel = await DeviceInfo.getApiLevel();

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Bluetooth Low Energy requires Location',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        callback(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const isGranted =
          result['android.permission.BLUETOOTH_CONNECT'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED;

        callback(isGranted);
      }
    } else {
      callback(true);
    }
  };

  const isDuplicateDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex(device => nextDevice.id === device.id) > -1;

  const scanForPeripherals = () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
      }

      if (device && device.name) {
        setDevices(prevState => {
          if (!isDuplicateDevice(prevState, device)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });
  };

  const connectToDevice = async (device: Device) => {
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      setConnectedDevice(deviceConnection);
      await deviceConnection.discoverAllServicesAndCharacteristics();
      bleManager.stopDeviceScan();

      await startStreamingData(deviceConnection);

      await readBatteryData(deviceConnection);
    } catch (error) {
      console.log('Connection Error:', error);
    }
  };

  const disconnectFromDevice = () => {
    if (connectedDevice) {
      bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      setTemperature(0);
      setHumidity(0);
    }
  };

  const startStreamingData = async (dev: Device) => {
    if (!dev) {
      console.error('No Device');
    }

    dev.monitorCharacteristicForService(
      '226c0000-6476-4566-7562-66734470666d',
      '226caa55-6476-4566-7562-66734470666d',
      (error, characteristic) => {
        onTempUpdate(error, characteristic);
      },
    );

    const onTempUpdate = (
      error: BleError | null,
      characteristic: Characteristic | null,
    ) => {
      if (error) {
        console.error('OnTempUpdate', error);
        return -1;
      } else if (!characteristic?.value) {
        console.error('No Characteristic', error);
        return -1;
      }

      const values = atob(characteristic.value).split(' ');

      console.log('Temp =>', Number(values[0].substring(2, 6)));
      console.log('Hum =>', Number(values[1].substring(2, 6)));

      setTemperature(Number(values[0].substring(2, 6)));
      setHumidity(Number(values[1].substring(2, 6)));
    };
  };

  const readBatteryData = async (dev: Device) => {
    if (!dev) {
      console.error('No Device');
    }

    // const services = await dev.services();
    //
    // console.log(
    //   'services',
    //   services.map(it => console.log(it.uuid))
    // );
    //
    // const yy = await dev.characteristicsForService(
    //   '0000180f-0000-1000-8000-00805f9b34fb'
    // );
    //
    // console.log(
    //   'Char ==>',
    //   yy.map(it => it.uuid)
    // );

    const battBin = await dev.readCharacteristicForService(
      '0000180f-0000-1000-8000-00805f9b34fb',
      '00002a19-0000-1000-8000-00805f9b34fb',
    );

    if (!battBin) {
      console.log('no Batt');
      return;
    } else if (!battBin.value) {
      console.log('No Value');
      return -1;
    }

    console.log('Value =>', battBin.value);
    const str = toByteArray(battBin.value);
    console.log('str', str.toString());

    // battBin.monitor((error, characteristic) => {
    //   if (error) {
    //     console.log(error);
    //     return -1;
    //   } else if (!characteristic?.value) {
    //     return -1;
    //   }
    //
    //   console.log('Monitor =>', characteristic.value);
    // });
    //

    // dev.monitorCharacteristicForService(
    //   '0000180f-0000-1000-8000-00805f9b34fb',
    //   '00002a19-0000-1000-8000-00805f9b34fb',
    //   (error, characteristic) => {
    //     if (error) {
    //       console.log(error);
    //       return -1;
    //     } else if (!characteristic?.value) {
    //       return -1;
    //     }
    //
    //     if (!characteristic) {
    //       return -1;
    //     } else if (!characteristic?.value) {
    //       return -1;
    //     }
    //
    //     const str = toByteArray(characteristic.value);
    //
    //     console.log('str', str.toString());
    //   },
    // );

    // if (firstBitValue === 0) {
    //   // innerHeartRate = String(rawData[1]).charCodeAt(0);
    //   innerHeartRate =
    //     Number(String(rawData[1]).charCodeAt(0) << 8) +
    //     Number(String(rawData[2]).charCodeAt(2));
    // } else {
    //   innerHeartRate =
    //     Number(String(rawData[1]).charCodeAt(0) << 8) +
    //     Number(String(rawData[2]).charCodeAt(2));
    // }
  };

  return {
    requestPermissions,
    scanForPeripherals,
    connectToDevice,
    disconnectFromDevice,
    allDevices,
    temperature,
    humidity,
  };
}
