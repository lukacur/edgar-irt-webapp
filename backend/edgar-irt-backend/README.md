# Edgar IRT exercises web application backend
This is the backend HTTP server that is used to access functionality for the job execution framework, statistics
calculation and adaptive exercising developed alongside the master thesis. This README will explain how to setup and
configure the backend server for personal use with the _Edgar automated programming assessment system_.

## Database configuration
Firstly, you have to configure the database that the server will use to:
- access data from the _Edgar_ database
- store data on adaptive exercises

Note that the PostgreSQL database server has to contain both the _Edgar_ database and the following schemas:
- statistics_schema
- adaptive_exercise

Please note that without these schemas (defined in the
[Database creation](https://github.com/lukacur/edgar-irt/blob/master/CreateDatabase.sql) file), this server will
<span style="font-size: 1.5rem">__not be able to run properly__</span>.

<br>

### Configuration files
After making sure the databases are configured correctly, you will have to specify connection strings and/or
configurations to reach those databases. This is done in the _`database-config.json`_ and _`pgboss-config.json`_ files
for the main database and the PgBoss database respectively.

The __database-config.json__ file adheres to the following schema:
```
{
    host: string;
    port: number;
    database: string;
    schema?: string;
    user: string;
    password: string;

    minConnections?: number;
    maxConnections?: number;
}
```

while the __pgboss-config.json__ can be either one of:
<ul type="none">
<li>

```
{
    queueName?: string;
    host: string;
    port: number;
    database: string;
    schema?: string;
    user: string;
    password: string;

    minConnections?: number;
    maxConnections?: number;
}
```
</li>

<li>

```
{
    queueName?: string;
    connectionString: string;
}
```
</li>
</ul>

where the `queueName` property represents the queue that will be used to enqueue outgoing statistics processing job
requests. You are now ready to proceed to the next step.

<br>

## Server configuration
You can configure the port that the server will listen on. This is done through the _`server-config.json`_ file. The
only two properties that this file contains are:
- _`address: string`_ property
- _`port: number`_ property

After configuring the server you are ready to start it.

## Starting the server
The server can be started using one of the included scripts:
- `npm run dev` - runs the server in the development setting (compiles it first)
- `npm run start` - runs the server (does not compile the server code)

The first script should be used if you plan to develop this package further. If no development is required, you should
run the `npm run build` after which you should use the `npm run start` script described above.

### Note for Linux users
All custom NPM scripts in this project are adapted for Linux usage. If you want to run a Linux script, add an `-l` to
the end of the script name. For example, if you wish to start the `npm run dev` script on Linux, use the `npm run dev-l`
script instead.

## Explaining the server boot output
On boot, the server displays all endpoints that have been registered for it to listen to. All of these endpoints will be
accessible by users that can connect to your server PC. Be aware that this is only a test server and is in no way
prepared to be used in a production environment.

<span style="font-size: 1.2rem"> __WARNING__: DO NOT USE THE SERVER IN A PRODUCTION ENVIRONMENT. THIS SERVER IS BUILT
FOR DEMONSTRATION PURPOSES AND SHOULD ONLY BE USED FOR TESTING THE ADAPTIVE EXERCISES FUNCTIONALITY IN ITS CURRENT FORM.
</span>
