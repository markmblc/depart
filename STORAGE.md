
# Storage Modules & onFile

## Concepts

Depart allows an uploading file to be piped to multiple storage modules simultaneously. For example, the file could be piped into a buffer in memory for further processing in addition to being saved directly to disk.

Depart comes with a `MemoryStorage` module, and a `DiskStorage` module, but any class implementing the `IStorageModule` interface can be used.

## `IStorageModule`

The `IStorageModule` interface is defined below:

```typescript
interface IStorageModule<SetupType = any, ResultType = any> {
    handleFile: (stream: NodeJS.ReadableStream, file?: DepartFile, storageSetup?: SetupType) => Promise<ResultType | Boolean>;
    removeFile: (storageResult: ResultType) => Promise<void>;
}
```

* **handleFile** - Will be passed the file's stream, details, and the appropriate value (`SetupType`) returned from `onFile`. If successful, the `DepartFile` will have a new property attached to it containing both the `SetupType` and the returned `ResultType`. This property is defined below.

```typescript
    storage: {
        setup: SetupType,
        result: ResultType;
    }
```

* **removeFile** - Is responsible for removing the file from storage. It will be passed the `ResultType` returned from `handleFile`, so this value must contain all relavent data needed to successfully remove the file.

## `onFile` 
The `onFile` function specified in `DepartConfig` allows setting file specific options that will be passed to each storage module. For example, if an uploaded file needs to have an associated record in a database before it is processed, then have its ID passed to a storage module, this is the place to do it. How those values are passed is different based on the returned value of `onFile`.

If a single value is returned, that same value will be passed to each storage module. If an array of values is returned, the value sent to a storage module will be the value at the same relative index to the array of storage modules specified in `DepartConfig`. If the length of the returned array does not match the length of the storage module array, Depart will error.

## `onFileStorage` 
The `onFileStorage` function specified in `DepartConfig` is called after all storage modules have successfully stored the file. The file will contain the `storage` property for final processing. 

# Storage Examples

## Storage Setup

```typescript
const parser = new DepartRequestProcessor({
    storage: [
        new MemoryStorage(),
        new DiskStorage({
            destination: 'C:\somewhere'
        }),
        new CustomCloudStorage({
            accountName: '12345678'
        })
    ],
    onFile: {
        ...
    }
})

const formData = parser.parse(req);
```

In the setup above, we will be piping each file into memory, onto the disk, and into a cloud service such as Azure or AWS.

### Scenario 1

We do not need to modify any file specific storage options, but `CustomCloudStorage` requires the id of an associated DB record.

```typescript
    async (file: DepartFile) => {
        const dbModel = new FileModel({
            fileName: file.originalName
        });
        return {
            id: dbModel.id
        };
    }
```
We can just return the id, which will be passed to each storage module, but only the `CustomCloudStorage` module will do anything with it.

### Scenario 2

We want to skip storage of all pdfs

```typescript
    async (file: DepartFile) => {
        if (file.mimeType === 'application/pdf') return false;

        const dbModel = new FileModel({
            fileName: file.originalName
        });
        return {
            id: dbModel.id
        }
    }
```

Returning `false` will completely bypass storage for this file.

### Scenario 3

We want to skip storing in memory for any file that is not a .pdf

```typescript
    async (file: DepartFile) => {
        const dbModel = new FileModel({
            fileName: file.originalName
        });
        return [(file.mimeType !== 'application/pdf'), true, { id: dbModel.id }];
    }
```

Because the `MemoryStorage` module was in the first position of our `storage` array during setup, the `false` value in the first position of our `onFile` return value will instruct `DepartRequestProcessor` to bypass `MemoryStorage` completely, but proceed with disk and cloud storage. 

### Scenario 4

Files containing the suffix `-thumb` should be stored in a different folder

```typescript
    async (file: DepartFile) => {
        const dbModel = new FileModel({
            fileName: file.originalName
        });

        let diskStorageOpts = true;
        if (file.name.includes('thumb')) {
            diskStorageOpts = {
                destination: 'D:\thumbnails',
            }
        }
        return [true, diskStorageOpts, { id: dbModel.id }];
    }
```


### Scenario 5

Similar to Scenario 1, we do not need to do much. But, after storage, we want to persist the created `dbModel` object. This is an appropriate use of the `onFileStored` property.

```typescript
const parser = new DepartRequestProcessor({
    storage: [...],
    onFile: async (file: DepartFile) => {
        const dbModel = new FileModel({
            fileName: file.originalName
        });
        return {
            id: dbModel.id,
            dbModel: dbModel
        };
    },
    onFileStored: async (file: DepartStoredFile) => {
        await file.storage.input.dbModel.save();
    }
})

const formData = parser.parse(req);
    
```
This technique ensures that the database record is not saved unless successfully stored.