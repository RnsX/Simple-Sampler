type CompanyEntity = {
    Name: string,
    Address: string
    Country: string // ISO2 country code
}

type PersonEntity = {
    Name: string,
    Surname: string,
    FullName: string,
    Locality: string // Latvia, Lithuania, Estonia, Russia
}

type PersonSampleTable = {
    Id: number,
    Country: string,
    Type: "Given" | "Surname",
    BaseForm: string,
    Variant: string
}

type CompanySampleTable = {

}
