# Depart [![NPM version](https://badge.fury.io/js/depart.svg)](https://badge.fury.io/js/depart) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Caution

Depart is in a pre-release state and is subject to frequent breaking changes. Merge requests will be ignored and issues are disabled until v1.0.0, the first production ready release.

## Synopsis

Depart is express middleware for handling `multipart/form-data`. It is also usable as a standalone request processor. 

## Features

- Strongly typed via TypeScript
- Promises & async/await friendly.
- Supports streaming each file to multiple storage methods simultaneously, without the need to store on disk first. 


## Installation

```sh
$ npm install --save depart
```

## Usage

**Please note**:  Depart's storage system is very robust and accomodates many different use cases. Please study the scenarios outlined in the <a href="STORAGE.MD">Storage Modules & onFile</a> guide before beginning implementation.

Depart can be used as a standalone class, or it can be used as express middleware.

### Standalone Processing
 The `DepartRequestProcessor` class is what is used to parse incoming formData request and can be used independently of express. Begin by importing and instantiating, optionally passing an options object implementing the `DepartConfig` interface specified in the Models section of this readme.

 This use case is ideal for non-express platforms, or for dynamically changing the configuration in each endpoint or request.

 ### `parse`
 This is the primary method of `DepartRequestProcessor`. It parses all fields and files of a request and returns a `DepartFormData` object which is defined in the `Models` section of this readme.

### Express Middleware
Depart can also be used as middleware. When utilized in this fashion, the incoming express request will have a `formData` property attached to it which will be of type `DepartFormData`.

In the express configuration file, instantiate an instance of `DepartExpressMiddleware`, passing an object of type `DepartConfig`. Then use the instance's `handleRequest` method as middleware. Example below:

```typescript

const formDataParser = new DepartRequestProcessor({
    ...,
    storage: [...],
    onFile: {
        ...
    }
})

app.use(formDataParser.handleRequest.bind(formDataParser));
```

### Models

#### `DepartFormData`

```typescript
    fields?: {
        [key: string]: string;
    },
    files?: {
        [key: string]: DepartStoredFile[];
    }
```
Note that all values of fields will be of type `string`. It is up to the consuming app to handle conversions and further processing. 


#### `DepartFile`

```typescript
{
    fieldName: string;
    originalName?: string;
    encoding?: string;
    mimeType?: string;
}
```
* **fieldName** - The field in the request that contained the file

* **originalName** - The file's name as set in the form data

* **encoding** - The file's encoding

* **mimeType** - The specified mime type of the file

#### `DepartStoredFile`

```typescript
DepartStoredFile extends DepartFile {
    storage: {
        setup: any,
        result: any;
    }
}
```


#### `DepartConfig`

```typescript
    fileFields?: string[] | {
        [fieldName: string]: DepartFileFieldConfig;
    };

    storage?: IStorageModule | IStorageModule[];

    onField?: (fieldName: string, value: string) => Promise<any>;
    onFile?: (file: DepartFile) => Promise<(boolean | Object)[])>;
    onFileStored?: (file: DepartStoredFile) => Promise<void>;

    preservePaths?: boolean;

    limits?: {
        fieldNameSize?: number;
        fieldSize?: number;
        fields?: number;
        fileSize?: number;
        files?: number;
        parts?: number;
        headerPairs?: number;
    };
```
* **fileFields** - Defines the fields in the request that will contain files. If value is an array of field names, Depart will error if a file exists in an unspecified field. For a more granular configuration, reference the `DepartFileFieldConfig` model. When omitted, any uploaded file is processed without restrictions. Not specifying this property can pose a security risk and is only recommended in specified use cases

* **storage** - Specifies the storage module, or multiple storage modules, that will handle each file. See `IStorageModule` model definition for more information (Default: MemoryStorage)

* **onField** - Called when a field is encountered in the form data. If return value is a promise resolving to false, further processing of the formData will be terminated.

* **onFile** - Called when a file is encountered in the form data and is responsible for setting up storage of the file. See the `Storage Module` section for more information.

* **onFileStored** - Called after a file is stored successfully. See the `Storage Module` section for more information.

* **preservePath** - Passed to Busboy. If paths in the multipart 'fileName' field shall be preserved. (Default: false).

* **limits** - Passed to Busboy. These apply to the entire request and are not field specific

    * **fieldNameSize** - Max field name size (in bytes) (Default: 100 bytes).

    * **fieldSize** - Max field value size (in bytes) (Default: 1MB).

    * **fields** - Max number of non-file fields (Default: Infinity).

    * **fileSize** - For multipart forms, the max file size (in bytes) (Default: Infinity).

    * **files** - For multipart forms, the max number of file fields (Default: Infinity).

    * **parts** - For multipart forms, the max number of parts (fields + files) (Default: Infinity).

    * **headerPairs** - For multipart forms, the max number of header key=>value pairs to parse **Default:** 2000 (same as node's http).

##### `DepartFileFieldConfig`

```typescript
maxFiles?: number;
requireUniqueOriginalName?: boolean;
```

* **maxFiles** - If specified, indicates the maximum number of files allowed in this field. Recommended this be set to avoid DDOS attacks. Requests exceeding this limit will error.

* **requireUniqueOriginalName** - If true, files with the same file name will be rejected with an error.

## License

[MIT](LICENSE)
