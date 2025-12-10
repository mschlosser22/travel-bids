declare module 'amadeus' {
  export default class Amadeus {
    constructor(config: {
      clientId: string
      clientSecret: string
      hostname?: string
    })

    shopping: {
      hotelOffersSearch: {
        get(params: any): Promise<any>
      }
    }

    referenceData: {
      locations: {
        get(params: any): Promise<any>
        hotels: {
          byCity: {
            get(params: any): Promise<any>
          }
        }
      }
    }

    booking: {
      hotelBookings: {
        post(body: any): Promise<any>
      }
    }
  }
}
