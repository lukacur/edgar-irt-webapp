# Edgar IRT exercises web application fronted
This is the web user interface server that is used to provide functionality demonstration for the job execution
framework, statistics calculation and adaptive exercising developed alongside the master thesis. This README will
explain how to setup and configure the frontend server for personal use with the
_Edgar automated programming assessment system_.

## Technologies note
This web user interface was developed using [Angular](https://angular.io). It uses the server that can be started
through the Angular CLI to host the web application user interface.

## Backend connection configuration
To configure the connection to the application backend server, you can edit the `environment.ts` and
`environment.prod.ts` files in the `src/environments` directory if you are working with development or producion
environments respectively. The exported environment object has only one property used by the application:
```
{
    backendServerInfo: {
        applicationAddress: "http://localhost:8970"
    }
}
```
The `backendServerInfo` object should specify an application address that the user interface will be connecting to for
running bussiness logic related to adaptive exercises.

After configuring the connection to the backend server you can start the application. Note that, if the server that you
configured is not running, the application will not be able to fetch data from the server and thus will not be working
properly. For best results, it is recommended to start the backend server first and only after it is fully booted up you
should start the frontend application server.

## Starting the server
The application user interface server can be started with a script `npm run dev`. This script opens up a new command
line window with the application server started in it. After starting the server, the application should be accessible
on the `http://localhost:4200` address.

### Note for Linux users
All custom NPM scripts in this project are adapted for Linux usage. If you want to run a Linux script, add an `-l` to
the end of the script name. For example, if you wish to start the `npm run dev` script on Linux, use the `npm run dev-l`
script instead.

<br>

<span style="font-size: 1.2rem"> __WARNING__: DO NOT USE THE SERVER IN A PRODUCTION ENVIRONMENT. THIS SERVER IS BUILT
FOR DEMONSTRATION PURPOSES AND SHOULD ONLY BE USED FOR TESTING THE ADAPTIVE EXERCISES FUNCTIONALITY IN ITS CURRENT FORM.
</span>
