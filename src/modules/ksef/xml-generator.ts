// ==========================================
// 1. DEFINICJE TYPÓW DANYCH (INTERFEJSY)
// ==========================================

export type TKodKraju = string; // Np. PL, DE
export type TKodyKrajowUE = string; // Np. PL, DE
export type TData = string; // YYYY-MM-DD
export type TDataCzas = string; // YYYY-MM-DDThh:mm:ssZ

// Typy proste
export interface Adres {
    KodKraju: TKodKraju;
    AdresL1: string; // Ulica, nr domu, mieszkania
    AdresL2?: string; // Kod pocztowy, miejscowość
    GLN?: string;
}

export interface PodmiotIdent {
    NIP?: string; // Opcja 1: NIP
    // Opcja 2: UE
    KodUE?: TKodyKrajowUE;
    NrVatUE?: string;
    // Opcja 3: Inny ID (jeśli brak NIP i UE)
    KodKraju?: TKodKraju;
    NrID?: string;
    // Opcja 4: Brak ID
    BrakID?: boolean; // 1
    
    Nazwa?: string; // Dla Podmiot2/3 opcjonalne w specyficznych przypadkach
}

export interface Podmiot1 {
    PrefiksPodatnika?: string; // Fixed PL usually
    NrEORI?: string;
    DaneIdentyfikacyjne: {
        NIP: string;
        Nazwa: string;
    };
    Adres: Adres;
    AdresKoresp?: Adres;
    DaneKontaktowe?: Array<{
        Email?: string;
        Telefon?: string;
    }>; // Max 3
    StatusInfoPodatnika?: 1 | 2 | 3 | 4;
}

export interface Podmiot2 {
    NrEORI?: string;
    DaneIdentyfikacyjne: PodmiotIdent; // Choice w XSD
    Adres?: Adres;
    AdresKoresp?: Adres;
    DaneKontaktowe?: Array<{ Email?: string; Telefon?: string }>;
    NrKlienta?: string;
    IDNabywcy?: string;
    JST?: 1 | 2; // 1-Tak, 2-Nie
    GV?: 1 | 2; // Grupa VAT: 1-Tak, 2-Nie
}

export interface Podmiot3 {
    IDNabywcy?: string;
    NrEORI?: string;
    DaneIdentyfikacyjne: PodmiotIdent;
    Adres?: Adres;
    AdresKoresp?: Adres;
    DaneKontaktowe?: Array<{ Email?: string; Telefon?: string }>;
    // Choice Rola vs RolaInna
    Rola?: number; // 1-11 wg schematu
    RolaInna?: 1;
    OpisRoli?: string;
    Udzial?: string; // Procentowy
    NrKlienta?: string;
}

// Sekcja Stawek VAT (Sekwencje w Fa)
export interface StawkiVat {
    // Stawka podstawowa (23/22)
    Stawka23?: { Netto: string; Vat: string; VatWaluta?: string };
    // Stawka obniżona 1 (8/7)
    Stawka8?: { Netto: string; Vat: string; VatWaluta?: string };
    // Stawka obniżona 2 (5)
    Stawka5?: { Netto: string; Vat: string; VatWaluta?: string };
    // Taxi
    Taxi?: { Netto: string; Vat: string; VatWaluta?: string };
    // Procedura marży / szczególna
    ProcSzczegolna?: { Netto: string; Vat?: string };
    // 0%
    Stawka0_Kraj?: string; // P_13_6_1
    Stawka0_WDT?: string;  // P_13_6_2
    Stawka0_Exp?: string;  // P_13_6_3
    Zwolnione?: string;    // P_13_7
    PozaTerytorium?: string; // P_13_8
    Art100Ust1Pkt4?: string; // P_13_9
    OdwrotneObciazenie?: string; // P_13_10
    Marza?: string; // P_13_11
}

// Sekcja Adnotacje (Flagi)
export interface Adnotacje {
    P_16: 1 | 2; // Metoda kasowa
    P_17: 1 | 2; // Samofakturowanie
    P_18: 1 | 2; // Odwrotne obciążenie (mechanizm)
    P_18A: 1 | 2; // Split payment
    
    // Zwolnienie (Choice)
    Zwolnienie: {
        P_19?: 1;
        // Jeśli P_19=1 to jedno z poniższych:
        P_19A?: string; // Przepis ustawy
        P_19B?: string; // Dyrektywa
        P_19C?: string; // Inna podstawa
        
        P_19N?: 1; // Brak zwolnienia
    };
    
    // Nowe środki transportu (Choice)
    NoweSrodkiTransportu: {
        P_22?: 1;
        P_42_5?: 1 | 2;
        Szczegoly?: Array<{
            DataDopuszczenia: string;
            Przebieg?: string;
            VIN?: string;
            // ... (uproszczone dla czytelności, można rozszerzyć wg schematu)
        }>;
        P_22N?: 1;
    };
    
    P_23: 1 | 2; // Procedura uproszczona
    
    // Marże (Choice)
    PMarzy: {
        P_PMarzy?: 1;
        P_PMarzy_2?: 1; // Turystyka
        P_PMarzy_3_1?: 1; // Towary używane
        P_PMarzy_3_2?: 1; // Dzieła sztuki
        P_PMarzy_3_3?: 1; // Antyki
        P_PMarzyN?: 1; // Brak
    }
}

export interface WierszFaktury {
    NrWierszaFa: number;
    UU_ID?: string;
    P_6A?: string; // Data dostawy dla wiersza
    P_7?: string; // Nazwa towaru (opcja tylko przy korekcie zbiorczej, normalnie wymagane logicznie, choć schema pozwala pominąć w spec. przypadkach)
    Indeks?: string;
    GTIN?: string;
    PKWiU?: string;
    CN?: string;
    PKOB?: string;
    P_8A?: string; // JM
    P_8B?: string; // Ilość
    P_9A?: string; // Cena jedn. netto
    P_9B?: string; // Cena jedn. brutto
    P_10?: string; // Opusty
    P_11?: string; // Wartość netto wiersza
    P_11A?: string; // Wartość brutto
    P_11Vat?: string; // Kwota VAT wiersza
    P_12?: string; // Stawka (np. "23", "zw")
    GTU?: string; // np. GTU_12
    Procedura?: string; // np. TP
}

export interface Rozliczenie {
    Obciazenia?: Array<{ Kwota: string; Powod: string }>;
    SumaObciazen?: string;
    Odliczenia?: Array<{ Kwota: string; Powod: string }>;
    SumaOdliczen?: string;
    DoZaplaty?: string;
    DoRozliczenia?: string;
}

export interface Platnosc {
    Zaplacono?: 1;
    DataZaplaty?: string;
    ZnacznikZaplatyCzesciowej?: 1 | 2;
    ZaplataCzesciowa?: Array<{ Kwota: string; Data: string }>;
    TerminPlatnosci?: Array<{ Termin: string; Opis?: string }>;
    FormaPlatnosci?: number; // 1-7 (np. 6 przelew)
    RachunekBankowy?: Array<{ NrRB: string; SWIFT?: string; Bank?: string }>;
}

// === GŁÓWNY INTERFEJS DANYCH WEJŚCIOWYCH ===
export interface KsefFakturaInput {
    // Nagłówek
    DataWytworzenia: string; // ISO
    SystemInfo?: string;

    // Podmioty
    Podmiot1: Podmiot1;
    Podmiot2: Podmiot2;
    Podmiot3?: Podmiot3[];
    PodmiotUpowazniony?: any; // (Można rozszerzyć analogicznie do Podmiot1)

    // FA (Dane faktury)
    KodWaluty: string;
    P_1: string; // Data wystawienia
    P_1M?: string; // Miejsce wystawienia
    P_2: string; // Numer faktury
    WZ?: string[]; // Numery WZ
    
    // Choice P_6 vs OkresFa
    P_6?: string; // Data dostawy (pojedyncza)
    OkresFa?: { Od: string; Do: string }; // Okres
    
    Stawki: StawkiVat;
    
    P_15: string; // Należność ogółem
    
    Adnotacje: Adnotacje;
    
    RodzajFaktury: 'VAT' | 'KOR' | 'ZAL' | 'ROZ' | 'UPR' | 'KOR_ZAL' | 'KOR_ROZ';
    
    // Sekcja Korekt
    PrzyczynaKorekty?: string;
    TypKorekty?: 1 | 2 | 3;
    DaneFaKorygowanej?: Array<{
        Data: string;
        NrFa: string;
        NrKSeF?: string; // Choice z NrKSeFN
        NrKSeFN?: 1;
    }>;
    
    // Faktury Zaliczkowe
    FakturaZaliczkowa?: Array<{
        NrFa?: string;
        NrKSeF?: string;
    }>;

    // Wiersze
    Wiersze: WierszFaktury[];
    
    Rozliczenie?: Rozliczenie;
    Platnosc?: Platnosc;
    
    // Inne
    FP?: 1; // Faktura do paragonu
    TP?: 1; // Podmioty powiązane
    DodatkowyOpis?: Array<{ Klucz: string; Wartosc: string }>;
    
    Stopka?: string;
}

// ==========================================
// 2. GENERATOR XML (IMPLEMENTACJA)
// ==========================================

// Helper do escapowania znaków XML
const escapeXml = (unsafe: string | number | undefined): string => {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

// Helper do tworzenia tagów
const tag = (name: string, value?: string | number, attrs?: Record<string, string>): string => {
    if (value === undefined || value === null) return '';
    const attrStr = attrs 
        ? ' ' + Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ') 
        : '';
    return `<tns:${name}${attrStr}>${escapeXml(value)}</tns:${name}>`;
};

// Helper do tworzenia bloku (otwarcie/zamknięcie)
const block = (name: string, content: string, attrs?: Record<string, string>): string => {
    if (!content) return '';
    const attrStr = attrs 
        ? ' ' + Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ') 
        : '';
    return `<tns:${name}${attrStr}>${content}</tns:${name}>`;
};

// Helper do generowania adresu
const genAdres = (a: Adres): string => {
    let s = tag('KodKraju', a.KodKraju);
    s += tag('AdresL1', a.AdresL1);
    s += tag('AdresL2', a.AdresL2);
    s += tag('GLN', a.GLN);
    return s;
};

// Helper do generowania identyfikacji (wspólne dla Podmiot2 i 3)
const genIdent = (id: PodmiotIdent): string => {
    let s = '';
    // Choice based on provided fields
    if (id.NIP) {
        s += `<tns:NIP>${id.NIP}</tns:NIP>`;
    } else if (id.KodUE && id.NrVatUE) {
        s += `<tns:KodUE>${id.KodUE}</tns:KodUE>`;
        s += `<tns:NrVatUE>${id.NrVatUE}</tns:NrVatUE>`;
    } else if (id.NrID) {
        if (id.KodKraju) s += tag('KodKraju', id.KodKraju);
        s += tag('NrID', id.NrID);
    } else if (id.BrakID) {
        s += tag('BrakID', '1');
    }
    
    // Opcjonalna nazwa (w choice lub sequence minOccurs=0 - w Podmiot2 jest choice, a potem sequence minOccurs=0 z Nazwą)
    // Zgodnie ze schema Podmiot2: Choice (IDs) -> Sequence (Nazwa opcjonalna)
    if (id.Nazwa) {
        s += tag('Nazwa', id.Nazwa);
    }
    return s;
};

export function generateKsefXml(data: KsefFakturaInput): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<tns:Faktura 
    xmlns:tns="http://crd.gov.pl/wzor/2025/06/25/13775/" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/">`;

    // 1. NAGŁÓWEK
    let naglowek = '';
    naglowek += block('KodFormularza', 'FA', { kodSystemowy: 'FA (3)', wersjaSchemy: '1-0E' });
    naglowek += tag('WariantFormularza', '3');
    naglowek += tag('DataWytworzeniaFa', data.DataWytworzenia);
    naglowek += tag('SystemInfo', data.SystemInfo);
    xml += block('Naglowek', naglowek);

    // 2. PODMIOT 1 (Sprzedawca)
    let p1 = '';
    p1 += tag('PrefiksPodatnika', data.Podmiot1.PrefiksPodatnika);
    p1 += tag('NrEORI', data.Podmiot1.NrEORI);
    
    let p1Dane = `<tns:NIP>${data.Podmiot1.DaneIdentyfikacyjne.NIP}</tns:NIP>`;
    p1Dane += tag('Nazwa', data.Podmiot1.DaneIdentyfikacyjne.Nazwa);
    p1 += block('DaneIdentyfikacyjne', p1Dane);
    
    p1 += block('Adres', genAdres(data.Podmiot1.Adres));
    if (data.Podmiot1.AdresKoresp) p1 += block('AdresKoresp', genAdres(data.Podmiot1.AdresKoresp));
    
    data.Podmiot1.DaneKontaktowe?.forEach(dk => {
        let dkContent = tag('Email', dk.Email);
        dkContent += tag('Telefon', dk.Telefon);
        p1 += block('DaneKontaktowe', dkContent);
    });
    
    p1 += tag('StatusInfoPodatnika', data.Podmiot1.StatusInfoPodatnika);
    xml += block('Podmiot1', p1);

    // 3. PODMIOT 2 (Nabywca)
    let p2 = '';
    p2 += tag('NrEORI', data.Podmiot2.NrEORI);
    p2 += block('DaneIdentyfikacyjne', genIdent(data.Podmiot2.DaneIdentyfikacyjne));
    if (data.Podmiot2.Adres) p2 += block('Adres', genAdres(data.Podmiot2.Adres));
    if (data.Podmiot2.AdresKoresp) p2 += block('AdresKoresp', genAdres(data.Podmiot2.AdresKoresp));
    data.Podmiot2.DaneKontaktowe?.forEach(dk => {
        p2 += block('DaneKontaktowe', tag('Email', dk.Email) + tag('Telefon', dk.Telefon));
    });
    p2 += tag('NrKlienta', data.Podmiot2.NrKlienta);
    p2 += tag('IDNabywcy', data.Podmiot2.IDNabywcy);
    p2 += tag('JST', data.Podmiot2.JST ?? 2); 
    p2 += tag('GV', data.Podmiot2.GV ?? 2);
    xml += block('Podmiot2', p2);

    // 4. PODMIOT 3 (Opcjonalny)
    data.Podmiot3?.forEach(p3Data => {
        let p3 = '';
        p3 += tag('IDNabywcy', p3Data.IDNabywcy);
        p3 += tag('NrEORI', p3Data.NrEORI);
        p3 += block('DaneIdentyfikacyjne', genIdent(p3Data.DaneIdentyfikacyjne));
        if (p3Data.Adres) p3 += block('Adres', genAdres(p3Data.Adres));
        if (p3Data.AdresKoresp) p3 += block('AdresKoresp', genAdres(p3Data.AdresKoresp));
        // Choice Rola vs RolaInna
        if (p3Data.Rola) {
            p3 += tag('Rola', p3Data.Rola);
        } else if (p3Data.RolaInna) {
            p3 += tag('RolaInna', 1);
            p3 += tag('OpisRoli', p3Data.OpisRoli);
        }
        p3 += tag('Udzial', p3Data.Udzial);
        p3 += tag('NrKlienta', p3Data.NrKlienta);
        xml += block('Podmiot3', p3);
    });

    // 5. PODMIOT UPOWAŻNIONY (Pominięte dla skrótu, analogiczne do powyższych)
    
    // 6. FA (Główna zawartość)
    let fa = '';
    fa += tag('KodWaluty', data.KodWaluty);
    fa += tag('P_1', data.P_1);
    fa += tag('P_1M', data.P_1M);
    fa += tag('P_2', data.P_2);
    data.WZ?.forEach(wz => fa += tag('WZ', wz));
    
    // Choice P_6 vs OkresFa
    if (data.P_6) {
        fa += tag('P_6', data.P_6);
    } else if (data.OkresFa) {
        let okres = tag('P_6_Od', data.OkresFa.Od);
        okres += tag('P_6_Do', data.OkresFa.Do);
        fa += block('OkresFa', okres);
    }

    // Stawki VAT - KOLEJNOŚĆ JEST KLUCZOWA (23 -> 8 -> 5 -> Taxi -> Spec -> 0...)
    const st = data.Stawki;
    if (st.Stawka23) {
        fa += tag('P_13_1', st.Stawka23.Netto);
        fa += tag('P_14_1', st.Stawka23.Vat);
        fa += tag('P_14_1W', st.Stawka23.VatWaluta);
    }
    if (st.Stawka8) {
        fa += tag('P_13_2', st.Stawka8.Netto);
        fa += tag('P_14_2', st.Stawka8.Vat);
        fa += tag('P_14_2W', st.Stawka8.VatWaluta);
    }
    if (st.Stawka5) {
        fa += tag('P_13_3', st.Stawka5.Netto);
        fa += tag('P_14_3', st.Stawka5.Vat);
        fa += tag('P_14_3W', st.Stawka5.VatWaluta);
    }
    if (st.Taxi) {
        fa += tag('P_13_4', st.Taxi.Netto);
        fa += tag('P_14_4', st.Taxi.Vat);
        fa += tag('P_14_4W', st.Taxi.VatWaluta);
    }
    if (st.ProcSzczegolna) {
        fa += tag('P_13_5', st.ProcSzczegolna.Netto);
        fa += tag('P_14_5', st.ProcSzczegolna.Vat);
    }
    fa += tag('P_13_6_1', st.Stawka0_Kraj);
    fa += tag('P_13_6_2', st.Stawka0_WDT);
    fa += tag('P_13_6_3', st.Stawka0_Exp);
    fa += tag('P_13_7', st.Zwolnione);
    fa += tag('P_13_8', st.PozaTerytorium);
    fa += tag('P_13_9', st.Art100Ust1Pkt4);
    fa += tag('P_13_10', st.OdwrotneObciazenie);
    fa += tag('P_13_11', st.Marza);

    fa += tag('P_15', data.P_15); // Suma ogółem

    // Adnotacje
    let ad = '';
    ad += tag('P_16', data.Adnotacje.P_16);
    ad += tag('P_17', data.Adnotacje.P_17);
    ad += tag('P_18', data.Adnotacje.P_18);
    ad += tag('P_18A', data.Adnotacje.P_18A);
    
    let zw = '';
    if (data.Adnotacje.Zwolnienie.P_19) {
        zw += tag('P_19', 1);
        // Choice
        if (data.Adnotacje.Zwolnienie.P_19A) zw += tag('P_19A', data.Adnotacje.Zwolnienie.P_19A);
        else if (data.Adnotacje.Zwolnienie.P_19B) zw += tag('P_19B', data.Adnotacje.Zwolnienie.P_19B);
        else if (data.Adnotacje.Zwolnienie.P_19C) zw += tag('P_19C', data.Adnotacje.Zwolnienie.P_19C);
    } else {
        zw += tag('P_19N', 1);
    }
    ad += block('Zwolnienie', zw);

    let nst = '';
    if (data.Adnotacje.NoweSrodkiTransportu.P_22) {
        nst += tag('P_22', 1);
        nst += tag('P_42_5', data.Adnotacje.NoweSrodkiTransportu.P_42_5);
        // Pętla po pojazdach (pominięta dla skrótu, wstawić <NowySrodekTransportu> tutaj)
    } else {
        nst += tag('P_22N', 1);
    }
    ad += block('NoweSrodkiTransportu', nst);
    
    ad += tag('P_23', data.Adnotacje.P_23);

    let marza = '';
    if (data.Adnotacje.PMarzy.P_PMarzy) {
        marza += tag('P_PMarzy', 1);
        if (data.Adnotacje.PMarzy.P_PMarzy_2) marza += tag('P_PMarzy_2', 1);
        else if (data.Adnotacje.PMarzy.P_PMarzy_3_1) marza += tag('P_PMarzy_3_1', 1);
        else if (data.Adnotacje.PMarzy.P_PMarzy_3_2) marza += tag('P_PMarzy_3_2', 1);
        else if (data.Adnotacje.PMarzy.P_PMarzy_3_3) marza += tag('P_PMarzy_3_3', 1);
    } else {
        marza += tag('P_PMarzyN', 1);
    }
    ad += block('PMarzy', marza);
    
    fa += block('Adnotacje', ad);

    fa += tag('RodzajFaktury', data.RodzajFaktury);

    // Sekcja Korekt
    if (['KOR', 'KOR_ZAL', 'KOR_ROZ'].includes(data.RodzajFaktury)) {
        fa += tag('PrzyczynaKorekty', data.PrzyczynaKorekty);
        fa += tag('TypKorekty', data.TypKorekty);
        data.DaneFaKorygowanej?.forEach(dfk => {
            let k = tag('DataWystFaKorygowanej', dfk.Data);
            k += tag('NrFaKorygowanej', dfk.NrFa);
            if (dfk.NrKSeF) {
                k += tag('NrKSeF', 1);
                k += tag('NrKSeFFaKorygowanej', dfk.NrKSeF);
            } else {
                k += tag('NrKSeFN', 1);
            }
            fa += block('DaneFaKorygowanej', k);
        });
    }

    // Inne flagi
    fa += tag('FP', data.FP);
    fa += tag('TP', data.TP);
    
    data.DodatkowyOpis?.forEach(d => {
        let op = tag('Klucz', d.Klucz) + tag('Wartosc', d.Wartosc);
        fa += block('DodatkowyOpis', op);
    });

    data.FakturaZaliczkowa?.forEach(fz => {
        let f = '';
        if (fz.NrKSeF) {
             f += tag('NrKSeFFaZaliczkowej', fz.NrKSeF);
        } else {
             f += tag('NrKSeFZN', 1);
             f += tag('NrFaZaliczkowej', fz.NrFa);
        }
        fa += block('FakturaZaliczkowa', f);
    });

    // Wiersze
    data.Wiersze.forEach(w => {
        let content = '';
        content += tag('NrWierszaFa', w.NrWierszaFa);
        content += tag('UU_ID', w.UU_ID);
        content += tag('P_6A', w.P_6A);
        content += tag('P_7', w.P_7); // Nazwa
        content += tag('Indeks', w.Indeks);
        content += tag('GTIN', w.GTIN);
        content += tag('PKWiU', w.PKWiU);
        content += tag('CN', w.CN);
        content += tag('P_8A', w.P_8A); // JM
        content += tag('P_8B', w.P_8B); // Ilość
        content += tag('P_9A', w.P_9A); // Cena netto
        content += tag('P_9B', w.P_9B);
        content += tag('P_10', w.P_10);
        content += tag('P_11', w.P_11); // Wartość netto
        content += tag('P_11A', w.P_11A);
        content += tag('P_11Vat', w.P_11Vat);
        content += tag('P_12', w.P_12); // Stawka
        content += tag('GTU', w.GTU);
        content += tag('Procedura', w.Procedura);
        fa += block('FaWiersz', content);
    });

    // Rozliczenie
    if (data.Rozliczenie) {
        let roz = '';
        data.Rozliczenie.Obciazenia?.forEach(o => {
            roz += block('Obciazenia', tag('Kwota', o.Kwota) + tag('Powod', o.Powod));
        });
        roz += tag('SumaObciazen', data.Rozliczenie.SumaObciazen);
        data.Rozliczenie.Odliczenia?.forEach(o => {
            roz += block('Odliczenia', tag('Kwota', o.Kwota) + tag('Powod', o.Powod));
        });
        roz += tag('SumaOdliczen', data.Rozliczenie.SumaOdliczen);
        
        // Choice DoZaplaty vs DoRozliczenia
        if (data.Rozliczenie.DoZaplaty) roz += tag('DoZaplaty', data.Rozliczenie.DoZaplaty);
        else if (data.Rozliczenie.DoRozliczenia) roz += tag('DoRozliczenia', data.Rozliczenie.DoRozliczenia);
        
        fa += block('Rozliczenie', roz);
    }

    // Płatność
    if (data.Platnosc) {
        let pl = '';
        if (data.Platnosc.Zaplacono) {
            pl += tag('Zaplacono', 1);
            pl += tag('DataZaplaty', data.Platnosc.DataZaplaty);
        } else if (data.Platnosc.ZnacznikZaplatyCzesciowej) {
            pl += tag('ZnacznikZaplatyCzesciowej', data.Platnosc.ZnacznikZaplatyCzesciowej);
            data.Platnosc.ZaplataCzesciowa?.forEach(z => {
                pl += block('ZaplataCzesciowa', tag('KwotaZaplatyCzesciowej', z.Kwota) + tag('DataZaplatyCzesciowej', z.Data));
            });
        }
        
        data.Platnosc.TerminPlatnosci?.forEach(tp => {
            let tpc = tag('Termin', tp.Termin);
            // Opcjonalny opis
            if (tp.Opis) tpc += block('TerminOpis', `<tns:ZdarzeniePoczatkowe>${tp.Opis}</tns:ZdarzeniePoczatkowe>`);
            pl += block('TerminPlatnosci', tpc);
        });
        
        if (data.Platnosc.FormaPlatnosci) pl += tag('FormaPlatnosci', data.Platnosc.FormaPlatnosci);
        
        data.Platnosc.RachunekBankowy?.forEach(rb => {
            let rbc = tag('NrRB', rb.NrRB) + tag('SWIFT', rb.SWIFT) + tag('NazwaBanku', rb.Bank);
            pl += block('RachunekBankowy', rbc);
        });

        fa += block('Platnosc', pl);
    }

    xml += block('Fa', fa);

    // 7. STOPKA (Opcjonalna)
    if (data.Stopka) {
        xml += block('Stopka', block('Informacje', tag('StopkaFaktury', data.Stopka)));
    }

    xml += `</tns:Faktura>`;
    return xml;
}