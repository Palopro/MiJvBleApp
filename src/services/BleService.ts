import {BleManager, Device} from 'react-native-ble-plx';
import {PermissionsAndroid, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

export class BleService {
  private static bleService: BleManager;

  public static getInstance(): BleManager {
    if (!BleService.bleService) {
      BleService.bleService = new BleManager();
    }

    return BleService.bleService;
  }

  public async checkPermissions() {
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
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          result['android.permission.BLUETOOTH_CONNECT'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      }
    } else {
      return true;
    }
  }

  public changeState() {
    BleService.getInstance().onStateChange(state => {
      if (state === 'PoweredOn') {
        // console.log('state', state);
      }
      console.log('state', state);
    });
  }

  public scan(timeout?: number): Array<Device> {
    let devices: Array<Device> = [];

    BleService.getInstance().startDeviceScan(
      null,
      null,
      (error, scannedDevice) => {
        if (error) {
          return error;
        }

        console.log('scannedDevice', scannedDevice);

        if (scannedDevice) {
          devices.push(scannedDevice);
        }

        setTimeout(
          () => BleService.bleService.stopDeviceScan(),
          timeout || 15000,
        );
      },
    );

    return devices;
  }
}
