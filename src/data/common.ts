/**
 * Eng ko'p ishlatiladigan ingliz so'zlarining asosiy shakllari (taxminan A1–A2 darajasi).
 * Matndan notanish so'zlarni ajratishda "foydalanuvchi buni biladi" deb hisoblanadi.
 * Keyingi versiyada 5000 so'zlik chastota ro'yxati bilan almashtiriladi (docs/ROADMAP.md).
 */
const LIST = `
a about above across act add afraid after afternoon again against age ago agree air all allow almost alone along already also always am among an and angry animal another answer any anyone anything apple area arm around arrive art as ask at aunt autumn away
baby back bad bag ball bank be beach beautiful because become bed bedroom before begin behind believe best better between big bike bird birthday bit black blue boat body book boot bored born both bottle bottom box boy bread break breakfast bridge bright bring brother brown build bus business busy but buy by
cake call camera can car card care carry cat catch center chair change cheap check cheese child children choose city class clean clear climb clock close clothes cloud coat coffee cold color come computer cook cool corner cost could country course cousin cow cry cup cut
dad dance dark date daughter day dead dear decide deep desk did die different difficult dinner dirty do doctor dog door down draw dream dress drink drive drop dry during
each ear early earth easy eat egg eight either else email end enjoy enough even evening ever every everyone everything exam example excited excuse expensive explain eye
face fall family famous far farm fast father favorite feel few field fight fill film find fine finish fire first fish five fix floor flower fly follow food foot for forget fork four free friend from front fruit full fun funny future
game garden gave get girl give glad glass go good got grandfather grandmother great green grey group grow guess guitar
hair half hand happen happy hard has hat hate have he head health hear heart heavy hello help her here high hill him his history hit hobby hold holiday home homework hope horse hospital hot hotel hour house how hundred hungry hurry hurt husband
i ice idea if ill important in inside interesting into invite is island it its
job join juice jump just
keep key kid kill kind kitchen know
lake land language large last late laugh learn leave left leg less lesson let letter library lie life light like line lion list listen little live long look lose lot loud love low lunch
machine make man many map market married match may me meal mean meat meet meeting middle might milk mind minute miss mistake modern moment money month more morning most mother mountain mouth move movie much mum museum music must my
name near need never new news next nice night nine no noise north nose not nothing now number nurse
of off office often oh old on once one only open or orange order other our out outside over own
page paint pair paper parent park part party pass pay pen pencil people perhaps person phone photo piano pick picture piece pig pink place plan plane plant play please pocket point police poor popular possible post potato practice present pretty price problem put
question quick quiet quite
rain read ready real really reason red remember rest restaurant rice rich ride right river road room round rule run
sad safe salt same sandwich save say school sea season second see sell send sentence seven shall she ship shirt shoe shop short should shout show shower sick side sing sister sit six size skirt sky sleep slow small smell smile snow so soft some someone something sometimes son song soon sorry sound soup south space speak special spell spend sport spring stand star start station stay still stop store story street strong student study subject such sugar summer sun supper sure surprise sweet swim
table take talk tall taste taxi tea teach teacher team tell ten tennis test than thank that the their them then there these they thing think third thirsty this those though three through throw ticket time tired to today together tomorrow tonight too tooth top touch town toy train travel tree trip true try turn twelve twenty two
umbrella uncle under understand until up us use useful usually
very village visit voice
wait wake walk wall want warm wash watch water way we wear weather week weekend welcome well were west wet what when where which white who whole why wife will win window winter wish with without woman wonderful word work world worry would write wrong
yard year yellow yes yesterday yet you young your
`;

export const COMMON_WORDS: Set<string> = new Set(LIST.split(/\s+/).filter(Boolean));
