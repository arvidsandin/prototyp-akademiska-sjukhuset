## About The Project

An web application to demo an alternative layout for administration of medicines at Akademiska Sjukhuset in Uppsala.


### Built With

* [Vue.js](https://vuejs.org/)
* [Papa Parse](https://github.com/mholt/PapaParse)
* [mousetrap](craig.is/killing/mice)


## Getting Started

### Prerequisites

* npm
    
    Follow the instructions [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to install npm
    
    Or, if it's already installed, run
    ```
    npm install npm@latest -g
    ```
    
* http-server
    ```
    npm install --global http-server
    ```

### Setup

1. Clone the repo
   ```sh
   git clone https://github.com/arvidsandin/prototyp-akademiska-sjukhuset.git
   ```
2. Start local http server
   ```sh
   cd prototyp-akademiska-sjukhuset/public
   http-server -p 80
   ```
3. Add sound files(optional)

    If you want scanning sounds, add two custom files named `Scanning_ok.wav` and `Scanning_error.wav` in `assets/sound`
4. Visit `localhost` in your web browser

## License

Distributed under the GPLv3 License. See `LICENSE` for more information.
