// Shared email building + sending for BlueSPACE HR edge functions.
// Imported by: functions/email-sender, functions/leave-alerts
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const FROM_EMAIL = "BlueSPACE HR <noreply@control.bihlabs.com>";
// HR system logo embedded in email templates
const LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAABDgAAAE0CAYAAADJ6oNTAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAQ81JREFUeNrs3d1V28DW8HHBysV7d3wqiFJBnAoQFcRUEFNBoAJMBZAK7FQAqcBKBTgVoFQA5+6586sJW4miyMb6mtkz+v/W8sontjVf2rM1GkURAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAC0cUAYDC/4u2k/yX6QgPffN/0dEzLQAAAADw1xuKAECJSW6sR3jcp/krpfoBAAAAfx1TBAAAAAAAwHckOAAAAAAAgPdIcAAAAAAAAO+R4AAAAAAAAN4jwQEAAAAAALxHggMAAAAAAHiPBAcAAAAAAPAeCQ4AAAAAAOA9EhwAAAAAAMB7JDgAAAAAAID3SHAAAAAAAADvkeAAAAAAAADeI8EBAAAAAAC8R4IDAAAAAAB4jwQHAAAAAADwHgkOAAAAAADgPRIcAAAAAADAeyQ4AAAAAACA90hwAAAAAAAA75HgAAAAAAAA3iPBAQAAAAAAvEeCAwAAAAAAeI8EBwAAAAAA8B4JDgAAAAAA4D0SHAAAAAAAwHskOAAAAAAAgPdIcAAAAAAAAO+R4AAAAAAAAN4jwQEAAAAAALxHggMAAAAAAHiPBAcAAAAAAPAeCQ4AAAAAAOC9N3290Xa7TfJfzCuT1/PR0dGGIkapjUzyX6bympTairHJ28tzpT295q+fAQAAAACMV+cERz4RNZPVpUxaq/92yFuk8quZ6P4wfyYxEp68LSzyX65e+T9t3tckOO7z19e83aSUNAAAAACM09HQk9aWsvx1mU9Y76ki/w3YTqpu8zZzSYm39/+iXytn1iM89NP/i0iQAQAAAD5rvQdHPmldDjhpjfPXXf4Zc6rIb3JbypWlj7uQZAoAAAAAYGRaJTgk8TC38P2W+WfFVJPXZpY/7zNFDgAAAADj03YFxyeL3/GKavJabPnzJgduUAoAAAAACIgPj4mdUU1eO3HwmQnFDgAAAADj4kOCY8JtKgAAAAAAYJ9jT75nTFUBAAAAAIBdfElwTKkqAAAAAACwiy8JjglVBQAAAAAAdjmmCAAAAAAAgO9IcAAAAAAAAO+R4AAAAAAAAN4jwYEQZRQBAAAAAIxL2wSH7U0/31JVaCCjCAAAAABgXNomOGw/tjWmqgAAAAAAwC7cooIQPVMEAAAAADAuJDgQnKOjow2lAAAAAADjQoIDAAAAAAB4jwQHAAAAAADwHgkOAAAAAADgPRIcAAAAAADAeyQ4AAAAAACA90hwAAAAAAAA75HgAAAAAAAA3iPBAQAAAAAAvEeCA0N7pggAAAAAAEN7QxFgYD/y14xi8MYmf52O9LgBAAAAeIwEB4Df/i86MituUkoCAAAAgG+4RQUAAAAAAHiPBAcAAAAAAPAeCQ4AAAAAAOA9EhwAAAAAAMB7JDgAAAAAAID3SHAAAAAAAADvkeAAAAAAAADee0MRHG673Sa7/u3o6CilhACMcfxjLPSmDqf5L5P8FcurcFLz379X/lzU6yav42dK06t6N3U+bfAj1PE46556D7stVMf9sue87jeUUhj9mjiMBEddAF8MAEXAlxz4s9VA0JwkfpgThpw0MkoYgAcnTDPm/Ud+vy8gem0szORlxsCfMg6mlLS1ukykDk/a1GPNue+qUsep1O8P6lbNxKXcd5smNXb1443EM+bX/xX1Tkyjqv6npfH6fanuJy3r/blU78Sxfp2/i3ov5jAHt4OaeYzxvdQeSIDZH9eLOi36ddM56Wj78lHLQt9a/p5pXhmnAwwGM2k0SZdA4ECZDBhmsLgfyyCRl/OiHBhbadQ55YFI0jDwKE8cOMGgz5NnIoFQ0mIC3NamNBamtOdeExonls5n1K37ui6SV60msj0oAueirlNqx+q4/T76k5B2Uef3XPFXEUsWY4Ct83dWGeMzamOQOm06T2jTl1NJegTZl0eV4CglNT7Kry6ZhvU19GQHCY6/Bq67Hk9CqQQaX0McmEpL6a0EbWMJ1CQ4NmPfJ4eT4LpJcTEWEiz5eT7bV7ffmAz1Mh4WdT1V/FXvS5Nf+nJ//byY9MwsTmQPnSSV65yEpp3xfujJb9OEx682kNf/PTXVuF7L5/CJgr78LZR6HEWCQ4L6KwUNaJeVTFRTEhzhJTik/T0M2PZMuzkLKbjIy2wd2bsy1fsKMYWB0VxZUmPfhPgLwfJBAdHcs69eBMJfSXYcnNT4HNldXUVf1jeZnXn01YsJ0opaHGU7KCbJXxjjDxrbtc5Jn0vnam/npUEnOEqJDV8CQdOQrkNKdJDg+FUGSwtt0AxI70IJJC0nOFTf1tTDSXTu4dcvTrDXXAn+HeheRC9JqjiAQ8pKgfDo67cSs8wDqmcmPeEnNXbV+Yr+3Wkc0HxR9hAkOOv795VnY3smcdiKBIeCBIeHiY1/jjcKJNFBguNXGTxZOkkFsxLBdoIjekkOZYGUXSJ9LonCYE6sX8d4j7+cy4ok1STQw0ylflfRSEmf/eRxzDK62GaAup8F2sep82ZtobiyHwqT3DCJjtsxJjpKFyc+e96/vavH45YBl9pgUK6WP3oeKJhBbp0fy53m8sbB/cXWoJbQXlqLA2hrU0kM2U4ODW0u4+FyLO3bBEWSHH6U4GgS8OGatmrq9skc85jGMDOhKfXZ+QgOuYht1oc+djrg/j3PX4+lup8EXueP5pgJNV49d88COzzTrs0Fl0cZ3ycj6uPFOfwqgP5drseLIBMcGicCpYb0EFiQYAa6B18aE1T0FwKIcQbLSxn/Qp40zOXkehNykCTjfREUjUk5gFrKLVah1nESaDKy6aR3OZYJj9S7uQh3I/17GYVzG9KhsdBy7MmtkZ67q+P7PPA6XUThJDbq6vFGEpaq2+xxAI1pHnBDKjemNVfncYATimBUAdIs8n/FWlMXEiTNAqvLWCa9N1HYKzYOYdrzQ2iTodKEZqyJjbp6fgz9Io5coS9WF1+MvH+bdj+65FZNm7gY4bm7mNMUia5pYHX666J0wPPRsjj6c6eBymM99rghmSsgpiEtR3KySCTgm0XAblOKYBTBkZkomccO3400WDbHfKf55NqwPufROK7itZ0MeZ/oGPGE5pC+HORFnNJKnQfq/R+mPB7HtpqDRPY/c5pFQHV6F41rVZYxi5RecDr2sCGVl3aObTJXBPU3nBuxp40g7AApkYkSyc4/t/FNPa5Pk6Rf0ndfDYa9THIwoWk84fF+XOMWpEbxynosMS2J7FpXPic3JXE99jot5qaqVmUde9SIYpZ2/nYhAwLBEur6Cu0i3Lq9kDGQOv4jjjzdq8jSI6SDCoY9q98ZwW+rQHnh6fgck9ggpq2LyUhk75XIOTzxrE5JXP/NxDJqklW+JDjM1TmWdv47IJDkwK7+gvCCpKWcTFHvRsrIp/rknNbwvOfLOU+uSo/1FrKurnzbo0GCepJZxLR17WIsT0nqoljNM/egThOZk9LX6+cfKlbVHnvU8KG4IQEY7GRaXCkgQHqdefTig/YgmeRG5/OeD/2Vp5917MueTXg/E6v20reDSXJIbP4QcdGpiaXmCxWsoj14zv7gOll1TD14L5YTAgMoEBgJ9FjuHFCQLAHSnGoKsr/G9NfRTnjZE2l8db5vLJgxEW5trjHJwSraxpYukxwkOMJQLO0iyQGEM1kqkhv060CCZBmjCZC6yZT2V67WjnvCG1NV/da5x+duM6nj9rRu1CQ5ZFUeT0Jqx1mSgwRHOIpnSzOgAp4juRHsxGhJtXSSHh0dZQr7azEh4/w7nr5crv+EKuq/zn3aU6nUFuaM871xnuQgFusn7nGR5CDBQRAAQB9OqIGNiXJrCnXazReFExqSGxb7stLvllE9g01wvbn1h+TGYG1g7qg+SW70Z2m7L5PgCDMIGPMAu6EJwGdyxYITakATIwmUrqiKbpPIo6Oje2V9dRLx6EerfVnjVX1ZVZRRPYNNjGIPztuziOTGkG0gcTC2k9zovx6tlScJjjDN5BF1Y/RM9cNXeb9dRNznGeLEaM4kuLNrhd+JANhBX5LVUNqcUzWDMOOm6nhWJm0kN4Z1ZyvRRXJj0L58Z2tFLQmOcF348DxpAL9PqknEVf5QJ0afKf5OzOqNlbL+ykord2607XuRt880/+WeqhnETOs+J6XJMAns4SfHtpJIjO3DiaOXDXgHR4Ij/CCATgooJ1cm7iiJ8MZECcxjir6Ta2X9dR6x0sq1O4X7jZlVHKwiHW7SqRHJDXsSWeU65Nhu2hmPfPa8Hg0SHGHjySrA4X3FdfBGPw1zYvRR0bGbyZe5ynyZv07z13+PSvI/v8tfZ/nrNtKzn5Gq1RuSjORRv0riG01fKG+npn9xq8owYm2rklnF5cTnoW5VIXFt1dXQF5tIcITPNCCWvQOv9xNXQZK5bSKhCuwFypbHRA1XgzKZeL3LJ2Fn+evWLKmXCVl5gvZrI8/8dZm/PuR/9d/oJeGxitxtoqht7w2SkXrMtD1lQzbC5VaVgSZFWr6ItDsmw/YNktiUyTaJa/vn0sG8oXxHwezH8U3uEQWgJ0iKPTipmkmwuZr/vfT7X3+fjymb0nHE8vdJ/nobvSSNtF7dsjImVsrFFZOsuG05WStWfNyXgkBTv58s1W2qbPUGyUiFQXJeL/8k6xw7l/5hq++bcSzLXz/l10z+PpMnvBwyPk3kO7+XNq4xiWdWcSSuY1kpNzYVdSfpsx149jSscl+PJB4rxr5yf34rv58qPi6z+fsir8cFCY7hFA3ke6URRaWAvXBSaUQ+BQEflAUBwOiDc8Vj4leZYL56q0LlMYlpJRCcWZwQNy37d0MHYg6Pz4z1p4fUX4OEx0baxq3UrTm+j9Fwq1TUrN7w/FG/Rf80beJH5d/+U+qbiYfHVjxlQ82tISbOytuLWfn0MFBdphKvbrr075rH296X2rtpE5+lb2uaIH2uxOeuzh0+reJKZdz+3ytlV0yGT5RPjJ97/m5Xkd6LMffS19O2fd3Subp1f86/32pfItbmSd5kznz3YLJGXXZlNsGOWaJmHseavx49Oe4bB+1lYfkY15p6rqP+4mOQWi23teUyWzg4xrmy8eFJxrN4oOP99ahWZce8GLiObxzW5dRiW55Ie74LeCxfbv1h6uGizbnA9H+py6VHsY3K857UQR8eZSyZOjiGicRxT4rqehJAnQ6paC9JD+dsbXOcXvcVlGPUWH8XQ7Tz0rn6QVOdjnnCprrBVAaCJ+XlYPsJAiQ4CPRIcNSfZLSMFU/STycW+8Ra0bFPAmrH1pMbAwZQU0Xj0XSr33KI/SiUTnLUn/tL5XfXsU4TJccRKxq35w7HtiflY8A00PP2eohjUzbRX9vs71KnWo6/9+MewyajafSyTPedbKw2yC0aZumQ2ZgtelnybJZKZkrLg010APfMvfwaln+a5Y9mbFzYun1NNrc0T/C4VHD8Q992EDs4pus+b0tpUb9mb5aVbFL6Tuq56fdZuTwGj86bJs4wt/GYp+GcywaXg8Q2JoaS2GajtCySrbKnbIim8eCz1Ok7qdNUw0HIBsRm3L5V8HU+OhwHtN228VwZAzYD1X9x3j6N7N4i9OvJROaz+z42GS+mSuqwOMbUYp9O5Tx9Gbl/vLX72z89WsHx6DrzrXBZX2FmuQxYwcEKjqblFuwKDiVXgZ62Cp4+IFeHNVwZjgc6Pq5i/ymLWM4Hj67qo0Mb1ebJ5WR++3J7rsYVHY9K2/70wDH/Zuvw9osmE0PXFc3c5/eKjYmjNnBhIY4ZrD8oWo1zp6HPyxjlejVHr3OXUFdwXMuKDaeZb9kZ1mTHtD0yjFUcgDuuV2+YqyAfhrja22KM3MgY6fqqcO+TRUdBy7XWRi9XgBeyEsDU+WrHf71VseHYH5+1xTfRy9X9lcO6vJd6NN9F08blscZVHDLO7VuxlkqdXvqwEby0vZXL7+DgQo6mDYbN+HgqKzaeHbWB2wHP3Tb6g4ZVtJfy2PZnBX3a1OOp41is13NtaAmOYtf4hbKg7izSsRxbdRAAhE4mvS4nTPcyRqqZQMrJ3fmJdYCEhO2lr5kvjwKX2x7Oo38vAKzkVk8t/TWOBkh+dZjUfLB5O9kB9biIdCQotU5EX0sKPMsk51RZUu+Q4zmP3D7NJLE4DiSRnicMrWQcSBW0gUzO3X1dLDH94cxSf3AZhxVz1Vtlfdp1LDbrc/VmSAkOUyHvtAZ4pWynluz8VQTANpdXDVZarhYoPLGaOpl53rYy376wJDpMmyycK/uKcyXf414mNRuFdZjJfdxagvVYw+13e5ICRR2mUqe3kb/OHca0JyOMl89drtrYde6Wi7irHsa4dzZWlsoFXldxWJHc0DpXdR2L9ZZ4CiXBsZEGo3ppnwQn7yIdVztYxQF4PHg3lCqcPNadWF0GzCR9UfVJwXdQm5is9N9L6b9jHmcPcSbxqnerNmrq3Hz/L65iWBsfomT1RrEJ5UpxWzB9f9Xy2M4sj3Eux4dzjYlqRbFYb/PSEBIcXiQ3Kg3H9XJsTcEbMAoOrxpsJKj2YXzcOJwkxZoeTdpComlzzgD6axK5eQpO2Up7YrLSf80ER8NKVbV9QVa8pAF1lVtH9W2rfjUky041JzdKbfu84fnb2qqN0rhuzvGuzvOXGvY+axCLudjTa9LXxXffExzFUp9nn760oiRH4nlAD/jERaBUXPnxZoyUAMBVEPCJNgYlbcGr5EYlMD6N3Cc56Av24lknqziG3mhUkmSub3dSf8W/0h5W0v+zPf8tlbmbi5Vprsb11Lfb0eT7pg4+upfHQPue4PAuuVE5Kbhcjk0QANgLxFxdNbj2KTgqB3WOxkbf9+G4IGkdRFvY+JjcKMU3LldiFeY0YWtWgR6X6/j40oeVGzX930yKzUquy9IEOZV2UtyelTr6ei7G9edIz+17jWNIF3XUx6bvPic4fA3ctQUBMx+euw54zsVVg9TXDewcXhWMA0gQ3DGmdyNtwOUmdGe+l6GsxHL5RJwJ+4xZq+sscrMiORn4/V22n3ufN6CVzUdvJZlxJL+eu7w9S8b12MFHf/F1vx2pr9THvu1rgmOj6VGwPQQBLgexEJ4eAGjnoo9del5mru7t7iUZ5TCQMwHcmiSHd/21cO375pOlPmD6sMt7zj/SlK1JQzoYeRKPyyTnOU1K57m9RV3eel5uX30cu31NcFwG1unMEiCXAQ1BADBcoOTiqsEqgBVurlZxJAE0O9Pm1tyu0tqJo8/NPH9saJ1zh/ENK1Tt+R7Y8biMiy99vf1eORfn9i++16XcJvXsW135mOBYBbYDdXk/DldYwQEMx8VVg+tAym7lIjnQ46TI5bnKJDce8mNZkujwIhAOqd9W4xuXF6WIb+zIAjseV+0m9XHfDe1kw1gX58FQ6tL2SrzOtwv7mOC4DrHzSdLm3mHnJwgAwpgs3Qe0xD1zNC72VWca6mEevSQ6HvPXBVe0Xz0XJo4+Ogt1YiO34qaOPp4Vqnbq2MWKwZOBxgCXt6dc05qCiMOMTSixWORmhVanOvMtwZEG1FjquLzKcRIB6DtQiiP7Vw2+BlaM3zweDzUt2zZt8SZ/PeXt8o4NGHdytdrlS+Dl6mqVakKTtiaU+NxVPJyGtkJ95HUaUizmol2+7/LDviU4gg4AJHmzIggAgmG7Xz3L1dKQuDievia5WoNVc4XS3LryJLewsILvj7eOPncVcqE6jG8mDlfljE3GebsTVm+EVaebUApPxm/b+3CM5haVEAP3Oq4yftyjDfTP9lWD4MZIuYffdqCQ9PTdM+VBjlmGPY9eHi37xH4dzs6F6Ug2FXQV3yQRbMh8PwC5hc/VGJDShAap0zhy8HjYAOvTdiwzmgTHGJIbRYfYOBoECAIAvwPrb4GWo/VAQYIinyd1TRXJjmK/jpuRJjtcHPO3MRSsw/iGW3AHGB/Nyi8ZJ8yYsZXxg/4f9nmCOOwwISasM5/mpW9a/Iyrq1HfRtQZvzoaZKdRYM8yBxwGgGbCGFv+2FD77w8Hnxn3dEI3yfkbz8rbHPuFeeXt+FmO4dtIVlG62FxwTOddF/FNEnKBVq5Q161A+E/PZR5yebqaDN9HGMp7B5+5CbAcfzqKRVppnOAwyyhfErUEAANyFRC/jwD0xXYQbybjU0fjc4iTzqSP8465TSWvk1Xk79XNYmXHPPRkh6sVK46eQDGq+MZcCfR5ybi0zVjOK29Lvx/zU5GGSEa4iIPvR3KL2lhiMfQnbvuDbzw5wM2YOr8ExBsHnTKmLwHenlRN/11T7L35T4/vdR2FsXy7NtkRhbOHBKs3wo1vvFmhKqv/zOT9RL53EiHkOPg7xR5ULPbrM/N+vKZvdNb69kJvEhwj7JCpowAAQD/eUgQERaVJ3SoKI8lRTgbMi2PKj69Idvh8NdJFgiMjvrFC9QpVWaFhnmb0kVhsdJNhbk8Zrl9NHI3rRZISjs7Jvmwy+nOElfrdp4bEJA9QEShBr8sozI3HCr8ePZu/zNNYzFNZ5hJc0meJbzTEN7HCyddUNul8zP/4kL+uOG84rQ8XbWTD7SnEYei//nxJcKQjrFRXT1LpOyD9Sf/ESMUUgdeSPt9MgtjzkZRdCMkOW8Y4udn43p+7xFjSH0xCw7wuOFeM+py9odgHxXnHc20Tj8cUnU5mSbOjjybbCfgbLEH3uG6WIt+O7LCLZId59OxypI+eZYKjI75xGaSbxMbC9APpD/QDGFwEZE6DAWJpXxIc2UgrNQ3gGHgyC0aHq9XYM7m7jMa5KrHYs+PBbL5mrmLTGkbNeh8wT1JxcS4oJTauIq4oMxkOL84HhhS3+SEvEhxjzPYHFtQCBErwzoATorNo3EuTTbma1RyPJDoQ8PhhVi8Ve2sQCw1Txn2WK3UUnhOKwHtxmx/iFhXdQgiAefwVAJTIfhynEfdfm8BlKSs6ElrGqGS+BMptJt1m75n8t3cRtyoOzfeLCezBAezX6mEVJDh0+x9FAADhKSU5eETgy4qOtTxRgquo4+Bi74F46A+QRJ25HWVGFePA8wCAnsdtEhwAADgKbvOXuV3lmtL4xTxR4mFMqzny+k+p9jDI7VbriFsdAKAvrcZTEhwANGIPC4xGPsldRC+rOTJK49fVGrOa44KigC/ME4Kil6ejAAAczwe8SHCwZBUYXXKAPo9RkSv5H6LxPUZ2lxuZNALaY1TTTueUBFq0nZhSAPrnywqOsV7N/Y+Dz+R+QJIDAByQW1bMY2RNoiOlRKI5SQ4on6AuIpIboXCx4WdMsQOvjrON8wDcoqKb9cROHlyzozMAOGTG4fxlblkxr3TkxUGSI0zvAwi659HLI2ARBi7wATo1vnDLCo7AKhQAEAZz24okOt7lr9WIA3CSHMQ3qsgVxRuqER0lFAHQv7YJjpQToRW2Ezus3sBYpRQBtDo6Osry13n0kugwv47x0bJzuWKOMPge1y0jLkKFNs66iAPeUvJA/9548j1PxlYxbe436gHL8wBAbwBuxuiVecnm27P89VF+HQOz8eiGWymD4CLGyXqKzxaRzpXFuybo3y3F4XHEnhI+9IMxYV4zUr4kOMY4YCYOPvM7XQLoZSKa5kEwBeG31NEVvUPb2BiTHeY4zW0BpzRPfzl8ckTWw3c3bfCzkombWcn1LX+ZpF+moF4vIv9v2zHJU5tJh6lpUzKeo38/ovFcAAhZ44sax7Y+qKN4hI9ScrFqJaMPAUB0K3tfeEGevrLKX2f56yj/q7Mo3D07koBuVRnrpMbnq9ZmAu/y1hQTp/26Xc3ctpa/7jUkNxzNDUKJgxNOucBOqzYJwLYJjv8xAAR5vBn9KAgnFMFoAyV0PJHKxOHS54OQSY+Z/Pw3elntcBtYewzlyRVjvdVm6qhfpF1+XlZvzB2W23X++iDJTK74D9OWfjg4ho9UI2Msapkxu1U89sajBnMiwWfw8pOoWU5l/QqB5uXYGI+AVmuZCaXtYzFj5NeB3jsJPAhKQ5w0yLj+K0iQvZ2KW1l8vopuVnXOzUSPEdNLLpLwffTtC4fnkjP2nqnVd6zsoowTqnHQvuNCcQvp/0ZSzu977oumH37rMi9906HibDNB2flIGsonB5+ZRuCEr2TyEtCk2Xbg8nPARCVjhOdkgmReC0kkFskOHwPsq2gkFz0C5KK99TFx/eToe5/6kHwNZO8pFwkOk7CdmZV3DA39n/Mctckv+WcvqAF3jls2GBeB7kRWNgStFHSOYVAfw+Dqoq/4viu3iwRNNsB7uljqyu1JOHRsMo+eLfYaMbey+Pb42djR08bQLcZxFcdtOn5v09ZiB9/5lNtR7I6LkZuLuNymEtb8hsf/OnbsWYMZwwDgandunqASVhDpc+Bv/bsPtEnbZgxlhyCC+t+blEZ/kh2rSP8mmJ+oPe+4iuN+eNbWTN87I7kxmgnxXPZ4QRj1GVPsbvmW4JiFPAA43sAqpTsExefB9X0gk0YXY6RZ6ZbQ/NGh3RbJjmKTUs1PZKGt+xfjeLmCw0Fbu1b0dJSxcXXB74KiD6Y+udjkWJcEh4vl1653sB7aVeRmeX7KVYJhy9fBZ/p8q4LtE8NzYHXPUlf0pvJEliLZoWas4KqnV5xsoG7G+B4SzjbPS79uH/OtcgO6ZczVrXqsSAsnDpsEtGG+l449azDG5xArQjqCq+ztN7qCtxPoXRKP+4Htk8KQKy1cXDmY0+UwhCLZEf25jSVT8LW4UuYPV4/37RSvOlgV98XT+g0i2SjJMBdx26+nQzFM9F6fmaNz1YzSd+e44wCQORoAQlzGtXT42ezcPCwXq52mnmaPXZwQQlvBMSFIwsAB47M8ovVD/rp2/HUSakQ/GZNcnZO6XsSxnUTzddP3OKAmmzr63CtWpQVTn6zIceiYAUDFif/CYZC24T7PwbkqXx+zxy5OCIMloOQpOi6uBF3R7TA0SXQs8t+eRu726PgPNaE+xpk4HpO6XsSZWO5XqadVHQfUbL85LEP24gijPqc86cudY08HANcnyz5P/FPHx/I1sDat8QTr6mrMZw/7wjTA+nGxQoqlrrA9IXOV5CCA1O/K4bl508MeY1b3tPL4Al5Ijyl3ubL5M/s39H6Ound0fvpM6btx7GmDMS58f1qAnMTMrSkuT2ah3Z6i7qTg6GkaxSTXpz7i6kSQDfz+rhLBNyx1heVx7pqSQCXOMecgl1ekfdzPwtekXRJKu5WkmKv4uJgbwP/5zpwn27lx7GmDKdx5HsAvHZ/IUm5PsVfWjj7Xi5VOcgKYO5yYDfn+rhLBwax0gzeTgtuIR47jz7iuYaLm40Wc2MO6DnFDRZcb8Cch7DdoVpLmLzNXW+evpeOVKa5WrN9wNrDv2OMGUwTwd552enPSd31C+Bpio1Z6z5ur56onnmSPvdxdv4GVo+O7CDTwhF5fKAKIO8eT9VUPt6cUsaZN7z2s6+A2VJSNlJ8dfoUbX/dwMHFn/nqMXhKcJgYxceg8fz1KoiNxUJ8m3sscFIfZiyOoJIdJXmufWxx73GDKE7ilZw1jGbl/lGOxC/7QXLSNWGG1pw4/e6m8Pywid0tbbSWeXCYTlyFsdCVXgh62fzz6uM+IuSon330rx3MR0q1Ejm9dha44x3UA3Ne4a3v8nHlW13EU7iMxV44/f+3T+UESG2vzvffE4nM5rjsHKzpc3UZ5EcK+aOaCmYlb8t8+SR1upR4Tbd/1uKf3cX3FZu5LkkNJcsNmnWUOjk3dRlcOn6ZhxJJEUHkyjNzeRpFaqv9N5C7J9WuZuK+TaLlSYE6o1Vv6YjkubxIdsuT4phT4TeXPD4Hdp7uJMPbkhus+mfn8NBLPNpkMeQm+6/nNJPIgyVFJbBx6LjNJsUfLt664TMDf+HyxScb1u+jfhO9M2uha0/H1leBYRe6v2KhOckiQfqckuWHcBnxC0nolweW9wFfablWQgdDlLWbPlgNgl4HSNPLsSlAxbkrAtO+kaQIj9YkOCeBu9hyDqR82hm3RjykCkhs1+rxSm7mIaT2p71kU7uqNSPapSx1/DbXn75aJjbq2/mjj/Ce3rLmKxYpklVdJjgbzV1P/Dwr2WukvweG4wVSTHOo2HpXGvFZ0EujrvlSttD495Jvjz1dzq0KpT7jsq1aDFlm6nzk8Xq+SHKU2cmib1Z7oOGSl0oUECL5PGGy2sR+kFdQEwQ9KJuZZz7fguhi3P3lQ57/G3BE0bw1PhyrO37GSuu8jsVF3/nu0sOLYXOB1NQcqkhxenOOlvTWdv84j+ytzhklwKGgwZTMJELVM5C4aBumhDdauliqrWzKp4N50FdljmXy6Tm4Y3wLve+qDpD1tZNZh3CwSHWpu+5Dynjf4/neO7k/uZaJr+XzHCg4d/fVRUZwTwuOKY+Ur0opN/oNfcSYrPVMlSQ6n5zUTPw6Q2KjGqVdyoWI2UH26vig/kXO86qfkSPk/dBjXy4kO6+eG44AaTDVANIPAwtXVShOYyiBwo+wEsLL5aFiHK0WmSm9ZWjn+/CLJkTjoE8Uyt6WCPmFrk91qfzCfmTk+9iJIUncFQdrITU+Bc5HMWStIdLQZi2auz2Mt2Q7aRrXfh6blzaUxXdNEN3Mxtg/kSmkbPOTWwdBoSZoVMZzV2xllTrOUCa+N82ksSYChLsppuCh/I8cXBxyHFYmOByWxWKdCedrqYnW5ctEwtjo9uQiUHR+zqs375CShxcLicV8oGxuWDttAoqgc1Oz5UDxWbsBjdbIioqf6fvJhI1UZ32z380mP339h+buvW3zH8s71Fy4SHhLnLBTGe9shErcO2kXZhbI+Ph14nNYcx6zHNr+R+l6GGKvIk9m0zM0ulPTvuYVx/VE+x6/VX4oajNUCLbKbSk/41k8ElbJ5UFL/N/KII9e3aGg6SQ6WACoFwY8K+wJtQMnjVot7eW0mtyxf+VqHUlcH9HfbY/2j5xPZdU/tqVgGPGjQKHHOjeI4Zz3QcbuMa58U3XK9UFjnC8vnqlHMbyRW1pbQeeq7vonF/hrjHl3U51AXno6GCugi988/32cVvdx/n3a5hUIqxRznJ+XHa2T564OLW0aUtwezvPmQMrmUR332cpKMXpZ3apLmr+s+nioiV9BMn9C6iZLp96eur3RHL/esaxsjrm0t75Z28tnR2FDcUnk75Jg4YF8vvr/VWw5fac91j48b/FyeH/95nxO4yO5tAY3HogPPp8Vjqb/3EOdMS3GO9lsSPvR1nlZ2znYWv5XG6vLjrTUx5yybSQ4tTwnadV64bzu/kXo+kePTfHW9t/4g49uDwuP7OvT5Xc7bRRzmum+vpC/3drxDJTg0NpjXAoGfxWS37gQpDaF4vZcTvk/3H566eib89uUeXd+fCtBr+SlO+mRygjw4MJbgL5F+4UM9n8mGr64nhbYnU1aCpD3HO5F28lHayUTJsZqT6u1AdWyjn5vA4JurNi1La68c1ed5nwm5gBIcdeO6iWt+RH8n9TdF/y6t5Cs2iS3iHF+WEQ860TWXGxWMVadDJHBeObdfRbov4NlOcJj+8OhJv9hI3/9RGgey0lzGeCu/TyJ/3Od1fjaCWKyow69yrtj0cKzTUhymrc7N/Pu/qhMcHjSYsel1MBhpW+g7wWEGlrUHx/0c7d7Ebxr5t4O6Ceg/aPky25fHKmpPlBZB0fdiUlY6GW12BIDFMSUSQE2VH2fvCWAHffx3YmroZIfU8UzG9dhhvf23z6vaASc4QmfGpw8Dr8bSUu63Mqkf8ljn0ctVXR8u4llNcEj5mKTuDd3OWUz6oe+VDZ7EYkX8ZY79Zyk228eMWf8pxWCaY/bLPi82vRnqW5oBJ28wJ5yIVQwG5xSDLmYylfeP1IP+MQmsD18q+z6mb2pf7RZHf1/huSoFBSG0iduBVrfdOOirZmIyl3oxSY4fMonufHwKV+DcO3xKF3Q5s9AWvik5F15IH+/1FjW5svsp0n97QtV7B/HbbV5eGq+Aj8GXgW7bOJNYTHvbD7XNbfpeSXs05Lf1bClXqJzdmlJqB6ZDrinHf8oljvTtwxAy53tv7GgHXA1yxwRKvV/5lSugS4XHal7FSpx9+w+VV+GYCxVxpO/++95vNWMFh5esXMFXfL4ubidslPArJSxN/55FOvfXUHtel/bgw4Q4tEnwhwHr1PSDO4rZid73T3oz5Lc1g23eYM4CmNz66tZ1cqMUWOPf/pHl/eM64lYuW86VtgNzNchchZpTRU4myUNc+dXYp4skRQiT40zDPjpQMbldWDxfpwr7z0xe5ik65T0XqreXFt/7vYwDU5pP5/ZgVoQuKQ0rBl+Nbs4peZ2aVQQXFLdV10PsLfTGwiBgluKfMwg4OfGrWI4vJwIzOJHp/rdsFrLUkWBj+AE0U/z9LiP9+1SE5nKgJy7MI3+vhnrTnykCJjzRy7Jym75GuhOExTlkRvOwEr+t5Fb8OaXh5yS4pk4vSxtxws5cdTHEGx/bGgSil53eYUfm4MT/mg3VshN7pAzc9mxvQtZijCyCdfYUsGM11JNTIlZkDX5+s/UoY6h2ansPFml3GUWPkkvi28HdD3i+rnNGnVox6KqcY1tHIc+qJyix02DOFG6+9o2q2dk3NhFJDi8H0J7bgQmcTyOSHEPbRANtNit7OMQU8aBYvYFzm49Lpf1hz3mbixPDn6/PHdQpsdjwzoZcWX1sudGQ5BjeqcMT/z4pVbO3b6zoG4O4VNofdrWDDSfWQWXRQFd+ZdO+zxTxsOcRVm+M3q3LNiCfzdVdlNtExnl7EL8uULm4YEuSY3DnQ+8Reeyg0ZDkGLbBqDzxyvfKqKJX+waBUyCBcMe+cs6JdZBgacjVbWZjMvYZGtYlRTBqKyV7i9EOseu8jf44vWDLBadBx/HBY/NjR42GJEf/zj2YzH2hml4f0COSHCEFwm3HyHtOrL16thAspRFJ3EEnlT6txkL//UtiRw3js+nrt1QJas7bJDn6m9NsFNQpSY7+Y3MrfeTYYaMhydHvQOBDWa4YJF7tF8WyOAL59u61BMKcWFWwkdwoJj0fmPgM1qcp1/EyfVfVxumSQOc8jWq7MHEuSY6A5jTEYv3NAW3G5seOG405UJb6dQvcP/iyDF8m7yuq7aByIsnRcgANKbgonVhpC+3HSGvLXE3flYnPB+qs18ktE4Zx1/+pwo3TIyY92HEeCCoOsUzlBVuJITivd4jNbV94PFbQaMxVGXYgbi6L9G4ous81dX3YRImJbbsBVGkg3PXEatpCShU3nhh9cDFGms/MXyYYumS860TrU8FgaUyP9CY32Iiw3m3EhawiyfGBttGI6tXopc1kicsbzvtcrKo+VtJo7mk0jaSuAveeAgIes9YseGJie0BQFcJtKfvaQv46pe80GiNPh3wE2YH1ZoL9dxG3rbTxrKEO4YwXCWuWr//VX89lBdsPmi8rMBu2HS9Wo0ssZhJXK6rt4DFh4eLDjxUOBASC+5lM2KnPV7Qk6E897KguJ7b0i9eDqjEETAuC6VfdahojS7etvItIVh4qi/xcoYh+XPqUsCbJ8fs2omLSxzj3b9u4pzR2th3vLtjK+MTT7l4/h69cfYFjZQ2mCARPI3aj39VYFoEcz5lPdex68JV+wWC6P6gaS8CUymSZgOlvxe0Ml0rrLZNkJauyAgx40Wsf9i6hP+Kr9auokoyU3xOr/D23MTEvew7Wt53M03pdRazQ2VWvzs/hx0objQn+2I3+j1tpLMEExXJ1lb1XGEzbMiuZRjsJKgVMXiUKB2SSPe/kdkftdZeS6NgdGEm/5rwwPkViy9vE7ciu1hfJqF23ETG2/ds+biM2qjyk7fjY55mvKqvXY8WNprwb/VgHyuIK9WWIAZ9HVzw2mspM7v8b62CaShC84Fzye/8i0x7GujdHcUL1biNKEh31gRG9epSKhHUWwJhcvlofaqJuFb2eUP5Gs94bw431nO3NxYgW89UxX4C81Vavx54MBmMLAot9BYJatbGrfiP9Vzy+KCy3sQ2mmfQJ7suvP7kuopfbVlZjmhSFEChVEh2rETbhVRRYwDuw7wEdS7FqYxHguFxcrU8Dq6/TA6/Q0p/3t4/inD2Wcsqk7QT7VCw5l4/t6WlFwkrdhfhjzxpO6ImO51LQPppAV/ly+43WuigNpiE/erdIbLwb214bLdpDJlfAQ090FBPiRUiBkvTnov6uo/BvPUobTJZsee9JnBBCrHMe+m2GpX13zj3vz1nU8KKb9GnO2a+3j7PA5zXlGC4dSb3els7jISc2ioRVRm/u0Xa7TfLXchuGx/w1z18TavZX3ZqyWCuolydf6sR8z/x1sw3Hg2kH9IZObSKWNvEUQHt4kmOJR1aHs/x1tw2LOZ5EaXnbPu+sW37PB4/78WKssY4cu0/j8WOX87Ccg4Y+3ovA5jXrQMb5Tm2HOEzt+L30JQ47CqHx5L/M8tfn/OVb8GsyYF9Zmru3bk0gbK6qTeX3tqSSdc48LLMr6RO+BZHPpT6R0gP6S36VxsipZ1/fXN01t4jdj3njyVIdfpRffZNJ3/6ieUyVhIPV84xc4W/THsw478vk7ln68e3YN5At9eUrxTFrKufhVQ/Ha84564HiEdOW3oXWpiSOM+fruYdxXDHOE8P92+/NeP3J07nqN9/isKPAGtBUGs9McQMyAfvX6GW3eHaKbzfwxzLolydrbw+o8+97TuZ/nTR9XzYrg+k88iPx5+Xg6XH/mck4qTXZsZH2sGLp494J0kmkO5G5KU2UNp6UrRcJjtL3TaQvJ0rH+d4myoH25aQUs7rux1k0UBKyFI98lHYa99S2LkPfk8us4ov+JLa1jvWpzGuI4cKo02epU6/j8qOAG1BcCgITh42ouCr9nc4PgqjfgVQxeKb0CadjZCInWtdjZFoaI0lqNKvHYnWb63PdplSPXvZr3xIce9rB1GHCoxwY05ebTXqKpGVsuc+qT0KWLm79+t5jjBskliuP9a5jOOY1/SU7kshtkrp87k5DKNujETWi4uT/XhpRMmAjMSeKHzII88QHaAyiksjeFfxM+kQxeNIn9I6R02j4W8IYI4efCJTrctJzXWalPv1T6jANpOy8TXC80g5Oov6unO/qz94mthS2w0npHF3ErF3P1xvptz+KOqOugjhnF23jben3fSa5y+1mQx+3EoOdlMbuIWOwnyHH5Ecjb0zFbQ7lE//7AwaHZ+nsfwV7dHp42v6THoOotNQ/zO8zruIF0UbKt4QdcjtYJifPIkB6ZoxUUZ/F5H1yYF9/jv48ijr4vhxSguOANpA06M/VuIex3X0fjir1GFXG299/ZtwdZTspz2sOHe/LbYd2oyfpMek4Xo9ynnpE8wGwY1K7K4AqD5gvAwkbSgHwf+wLPsEBAEDo3lAEAMokw5uWg3BKBQAAAIB2xxQBAAAAAADwHQkOAAAAAADgPRIcAAAA9iUUAQAA/SLBAQAAAAAAvEeCAwAAAAAAeI8EBwAAAAAA8B4JDgAAAAAA4D0SHAAAAAAAwHskOAAAAAAAgPdIcAAAAAAAAO+R4AAAAAAAAN4jwQEAAAAAALxHggMAAAAAAHiPBAcAAAAAAPAeCQ4AAAAHttvthFIAAKA/JDgAAADcmFIEAAD0hwQHAABAFG1G8pkAAATriCIAAABjt91u4/yXR6tBWI6SBwCgP6zgAAAAo3d0dJTlv1xb/EhWbwAAAAAAgGFst9vl1o45pQ0AAAAAAAaz3W4X+etpwOTGklIGAKB/3PsJAABQIY9wNU85STq+1fv8Zd4ry18/89f90dERt6cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBru92utyUBHddi+7eE2g6jLikRAABQOKYIAMC7Cd68Mlmfe/b919thJR7XbVJ6TWnt6upmSOsRlWVcaesTWhgAoA9vKAIA8M7nyp8/5a8VxRKE8iQ3zV+nFAkCNM9fV6U/n0p7BwCgE1ZwAIBHZHVC9co+V/sBAAAweqzgAAC/fNrx92ZVx7mnx9T3KoUNzQQWrPLX1x7f75kiBQCgGxIcAOAJuU99XpkQFfeuz/J/vzw6Ouo6SbosvacV+XdOLU1Gy59DEgRd/bTUdgEAwIFIcACAPy4qfzYrNu7k9yYpMYs67sWRT9iCnPjnx5Xlv2Q0IQAAgHCxBwcA+KN8e8p9Pmm/j/5eiXBFEQEAAGCsSHAAgAe2261ZnRGX/qq49/9L6e9inx+RCgAAAHRBggMA/FB+NGwmqzcM82t5341PFBUAAADGiD04AEC57XYb578kpb/6/eQGs6lo/u8myTGXv5rnf76WPSfafJZ5n7j0/otAyjCplOFqVxlJeZfLIN3zvmZljXlE70npr03C6ce+z9j1WRWTXStymm5uKRvUJjXf1djI903btpsD2u776N/HGxefe9/D5rj7PvukUsbmc7+XkoS+tGFTfqa9va0cz3Op/tKeP7PY2yfu2m4qbflt5Z+n+b/X/VjWtE1KORVtrlxO5n1+SnvbdKiDyWv9sDLemGNYVX/WlF8f7b5mDNkM0Z8AAACAviYZN9u/xdWgu/Lviw6ftS6/0UDHM/hn1HzmolJGyaH/t25Ckb+W+etp+7qbht/rIE0mP/JdD7Xu4zYn8x75667B597JBLBxXXY45kdJUDU5pl76WcP6W8h33R54TPM+kikt6i955T3bWDT4zia5+zBkOb02duV/dVFTV+sd4/hFT22kfMxPkpQCAAAAVCY3JpWJ9N0BQe4jCY5hEhwygXlqOElbukhwtH3vIjHTZqIk7fWmy+d2SXC0POb5gcdmLcHRQzmutdXfUAkOSQKtW77/w6GJtX1jl5TbruTKuvQ9t32M05VE1EFjDQCMBbeoAIBu5gpzeaLydcf/M5uNFsGtCaTnZlk0xdffhFPKt+6Kf1r6fRz9e8uJubL8I6+P25qfzSo/X068mGXmmx6/q3k/0ya+R3/v22I+82P09y0k5uqymdCfHrrcXT53Hf17K0pxnMUtDcaJ/L/qJPxCJpxnTZfZy+RuXvO5mfx+suO7mQl977fndGhrM6m/yY629r3yd++lDieVOl07qj/z2XWfu6+fbCptsvy5eyf48p3rymojL3Nbylv5vtVjm0o5nbe9ZemVciv63a9HVef/d1Vqo2acnnW8VepTzXkAAAAAUDuxfjzkil/NSo91y89jBUfNCoGaK8Q7l7jLUvnqKo+nA7/ntoc6rF5JfjrwSnhSs7z+4ZCVAHuuYK9fKev5jtsvlg3rp3pLyrLuyrxcRb9r8nmV8hl8BUdNW32UlUOTV8q/bvXK3aGT9Jb1N9v1c331x33JjR2rqZbV2/gq9b9rlU/SdOzaUW4PUl/xAW1o3bGtlI//gTMmAAAANCc3kob7OSz37dVBgqNdgqPNvfM1S8e3h+z30HXyU/NdHxsuwZ/UtKO7pnXa5NaPHW13uyeBVK2fi0oyJ2n5eRMlCY4iWfnU9DMkYdRm4l6X9LnoWH8XQyU4ahK6B9d9qX8+1vx83LCd31R+/pA+/tB1nN5R1/MIAAAAUJzgaJSw6ON+bBIce/dxeGoyEaupv0P2l2id4KiZgD91mDzdHZqcqSQYCtMe2vvDgfXz1GS1yZ4J8lxDgqP0WXFPbX3ZIikyb/G5N4fuMdFDgmNd0wamDd+jbvXFuuHnblu0vXkf+2ZUvgubiwKAYA8OANCZ3DCTm/Ik49U9AsyjD/OfM/ecF4G+WT5+qf2RgV2Xacuxn1r4qmcNH8P5tVKH04G/303N981avte5fN+49N73dZPE/Jeryl9ftnkMZ/4z59LuzXf+1mBvAvMdnqMG+3bI45VX0cteI4X3Db/yp/w9TjrW2de6vXI6Pu7V7PXyOfqzL8VM6nOXav1dt9m/J/+ZS0kyNK2/puOFSYYkNW190/D7mjZgyqW8h0fSYv8i87mnDdreSpKdk7bjdM2jw+95NCwAAAA0T/oXLZ/00GnZsosVHH1oUZ5Jg//b+mp903042q7gqFldcNdDPb3almr+z9pB3zjo9p+a95k2vHqfbPu3GKiM7g5Z/VVTf4+Oxrekw7HddPwuF4e2gx1j17SH479o+PM3Xb8DAITqmCIAAJXKu+M/N7iiaK6alq/kXVGUnWV5+bediKal308stRej89MUpM1lpb/6eMDnXjuon7TNaoGaK/5xQG32x4HH9lFB/TWZ2JvjKCeznrt+Z3m6UbmdN7k9aNVmtVL0ssqm7HPDny+XwabldwCAIHGLCgDoC+LnlQnJqkGwbpZdm8nevJjYmKujHZe8D+1aeZV89aDZJKXfZz3Wt2lLFzWTqqE/11b9lG/pihv+rDnW7x2/e6qo3Tx78GjppNo+e7o1o9zOi7Z+e8DPtUoklm6RKo/TBz0yVlYrxV2/AwCEigQHAOjT9Wr8l+jvvR8+KZhI7Qv2F8rrI9X85WQfjLgyae/L9/LEzyyFL64W19xW4Kqcuuz10GVy/N1W25U6nsqrbiWQqZOsyZV8WaUwGajdDCWu/PlbT+/7LWqxH0vHlRN14/QhbflTpf3eRwCA30hwAICuyaoJ4MsTx7TpRpE1m43OfdhsFK1V77+f9Li3w9vqe+/5vz9dHHzI7VpWc5nbSGYH/v9fY0bLZMF3D4qkuqnrpqc2lFa28okttFszTqel8d5sNhrvG+9rbtFhc1EAqCDBAQC6VPfMSHra7NNcnVxQvKOQRP8u5R8CGxsORDaNXLYs42Qs5dThKUFafKnUl9mL43LP/5/X/DwAoIRNRgFAz6TGXB2fDfT2nyhh9Iwrx8OMA2YS+xD9ndwwZW32hDjLXx+OSvI/n8rL7GWTUoL+kD03stJfzeU8cMg4nrK5KAD8ixUcAKCHSW4M9aSNgzexg/fSaLiNW8sTqoyi7pes3Kg+9tTU5e2uWxFKG7um8h4TeY/5CMprEsAtGl9KdV4kuVc1x5pEf98685UeAwD/IsEBAHpUb09512UJtkyWHkp/ZZY/k+AIz2bPpHdI1Ynle6qis5vo7yTnedMnm8gTOg7ZD6U6tpx40taT0p/NGNe5rddsmJtZPKaVjP2T0nmgrs7bPjocAEaFW1QAQIGaq3Np1/vLZflyefKbyCZ1CIhcwc4q9Tyx8LnVxEpCbXQaA+JKGa6GnMTK+PJsu9109KPy5489ve/HVz5n6P5brue4mnCRepmX2wY9BgDqkeAAAB0+V/7c1/LjL698DsKQVv48s/S55RVBE9k/Au3ElT9/s1x/NtuNtnY+e+VzhvbaOD1/5f8DAAQJDgBwrObRf30uPzYTmPJV2rkHV2nRfYJ0Zelzvzr63DF4dlF/mscHWXWSlv4q7ppUy3/ePGEqLv3VxvbmnXJc5WTTrLLarpzwSAN4egwADIYEBwC4Vw3QVz0Gzs+VwHnIJ7XA3cRvUzPxu+g48bvLX0uzOe2uSW/NUyDM5y46fKb5vAfzHrKHzJhNWpah+blPB7abtNpuog5JKkv1V91A96ZtUkaSCNXjdbU64kvdeUHKMS79PZuLAgAAQK88gH3a/i3u+f2nlfd/2PN/1+X/ONDxDv4ZNZ+5qJRB0sf/7ftYK5+7bvhZSeXnn9pOMk1ypPJeF3v+72z7r3mLz5zXvE/8Wv3Yaos15bsYuJ+uW77PsqYckwbH1bb+6t5nOkQfq9abJFUmDd9jIj930NhoY+yqfJ+nmvp84owJAAAAzcmNeR+TmoaB884JBQkOVQmObYtJ203XJEdNm3xsOam+6PCZxvKQ+gklwSGf8Vj5jFnDn6+rh1fbcE27aXR8kuSqJmrvGvSxm4bHGdd83sOhyWH5+YdDEzIWExzVfnBROc6bCAAAAFCc4Fh3vXLaMnBekuBQmeCoTnCX1SSHTM6WuyZzcmtJ48mqvO9dmwTJjqvhWzn+5JWkwbrm53ZekQ88wTGvKf/5AT9XLceHpuPKjnbzWv1Nd/zc077kXM2qn6e6z5HyWBz4HsX7LPa0nYn8+1ObVSuWxsen7W5xBAAAAChNblSXpD8N+FmTmsB5QoJDXYJjuWPSdifv9fDaCgmp67pJ56Ncqf/9OFBpg7M9nztt2MYedkzMHuSzF/Ja1iRzyv93emj9hJTgqPtOpUTDvJjgSlkncoX/oS451DRRsqfdFG1neWD9PR2wEiLeU/dFW396bVzcsfKnXGaL0mu95//OtYxdNePPoKv7AAAAgL4C2WWXZdo9fN6CBIe6BMd0e7iHhsfcxEOH/TtuOnzu3Wu35YwgwTF5ZTK+z00pefXQ5vt2bDfrQ2+r2pNMqTN7pc88tvy+j036t6XxcdIlCQMAY8dTVADATXKj7mkmQ+/eX33/T9SELvI0lPPo9UeEZtErT1PI38tMaN9FzZ7KY973PP/ZD20flZn/3GX+y4fo76f3vCbNX6f5z57Jk3/G3AbMY6JPo5enhRxaFqaO35myL5XfdcvPb9NuNtJuThvU33n09xNc9h1btq/P5K93crzZgZ/9LP//gzxJRlX915R9n48OB4Cwz6MUAQDYJwmOaSWwTS18blKdmJQnJHLVfjLkd7LxGTWfGUd/P2pxs2si1uT/DnWs8h1MAuxjzUTyuzyetWl7M+93Ujm2YrL3wyQk2iY1XjmOZM/nfpfPzdrWZZf206R+avps1uR7dxgndtXbplRvz6+0I/M+q6bf94B2Y+ov7dJuZHXGx8r7t2obpfebyneu+i79+V7z2CWrNcr7JN1K4hAAAAAAAMAPNbfcxJQKAAAAAADwRs1eL2wuCgANsAcHAAAAoEN1b6SvFAkAAAAAAPBGzeNznygVAGiGFRwAAACAe/PKn79QJAAAAAAAwBvmiTVmxQabiwIAAAAAAG9tt9u7SnLjjlIBAAAAAACqbbfbqXlCiryqj4U1EkoJAAAAAACoVvM4WFZvAEAP2GQUAAAA0OE+f51TDADQzhuKAAAAALAqy19p6c/f89f90dHRhqIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACf+vwADAOnpbWcvkIMnAAAAAElFTkSuQmCC";

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

type EmailData = Record<string, any>;

function greeting(data: EmailData): string {
  return data.recipient_name
    ? `<p style="font-size: 14px; margin: 0 0 16px;">Hi ${data.recipient_name},</p>`
    : "";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export function buildEmail(type: string, data: EmailData): string | null {
  const base = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
      <div style="background: #1a365d; padding: 24px 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <img src="data:image/png;base64,${LOGO_BASE64}" alt="BlueSPACE HR Logo" style="height: 34px; width: auto; display: block; margin: 0 auto 12px;">
        <h1 style="color: white; font-size: 18px; margin: 0;">BlueSPACE HR</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Leave Management System</p>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
  `;

  const footer = `
      </div>
      <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 16px;">
        Bluespace Financial Cloud &copy; ${new Date().getFullYear()}
      </p>
    </div>
  `;

  if (type === "leave_submitted") {
    const halfDayLabel = data.half_day_type ? ` (${data.half_day_type === 'morning' ? 'Morning' : 'Afternoon'})` : '';
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px;">New Leave Request</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">A new leave request has been submitted and requires your review.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Employee</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}${data.is_half_day ? ` (Half Day${halfDayLabel})` : ""}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Reason</td><td style="padding: 8px 0;">${data.reason || "Not provided"}</td></tr>
        ${data.handover_name ? `<tr><td style="padding: 8px 0; color: #64748b;">Handover To</td><td style="padding: 8px 0;">${data.handover_name}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please log in to the HR portal to review and action this request.</p>
    ${footer}`;
  }

  if (type === "leave_approved") {
    const halfDayLabel = data.half_day_type ? ` (${data.half_day_type === 'morning' ? 'Morning' : 'Afternoon'})` : '';
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #059669;">Leave Approved</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Your leave request has been approved.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}${data.is_half_day ? ` (Half Day${halfDayLabel})` : ""}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
        ${data.remark ? `<tr><td style="padding: 8px 0; color: #64748b;">Remark</td><td style="padding: 8px 0;">${data.remark}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">You can view your updated leave balance in the HR portal.</p>
    ${footer}`;
  }

  if (type === "leave_rejected") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #dc2626;">Leave Rejected</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Your leave request has been rejected.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}${data.is_half_day ? " (Half Day)" : ""}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
        ${data.remark ? `<tr><td style="padding: 8px 0; color: #64748b;">Reason</td><td style="padding: 8px 0;">${data.remark}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">If you have questions, please contact your manager or HR administrator.</p>
    ${footer}`;
  }

  if (type === "employee_created") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #2563eb;">Welcome to BlueSPACE HR</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Your account has been created. Use the credentials below to log in.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Name</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0; font-weight: 600;">${data.email}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Employee ID</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_id || "Pending"}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Password</td><td style="padding: 8px 0; font-weight: 600; font-family: monospace;">${data.password}</td></tr>
      </table>
      <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px 16px; margin-top: 16px;">
        <p style="font-size: 13px; color: #92400e; margin: 0;">You will be prompted to change your password on first login.</p>
      </div>
      <p style="font-size: 13px; color: #64748b; margin: 16px 0 0;">Log in at <a href="https://hr.bihlabs.com" style="color: #1a365d; font-weight: 600;">hr.bihlabs.com</a></p>
    ${footer}`;
  }

  if (type === "leave_cancelled") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #d97706;">Leave Cancelled</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">A leave request has been cancelled.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Employee</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">No further action is required.</p>
    ${footer}`;
  }

  if (type === "leave_extended") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #2563eb;">Leave Extended</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Your <strong>${data.leave_type}</strong> leave has been extended by ${data.reviewer}.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Previous End Date</td><td style="padding: 8px 0; font-weight: 600;">${data.old_end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">New End Date</td><td style="padding: 8px 0; font-weight: 600;">${data.new_end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Total Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
      </table>
    ${footer}`;
  }

  if (type === "holiday_reminder") {
    const holidayRows = (data.holidays || [])
      .map(
        (h: any) =>
          `<tr><td style="padding: 8px 0; color: #64748b;">${h.occasion}</td><td style="padding: 8px 0; font-weight: 600;">${h.date}${h.end_date && h.end_date !== h.date ? ' - ' + h.end_date : ''}</td></tr>`
      )
      .join("")
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #1a365d;">Upcoming Public Holidays</h2>
      <p style="font-size: 14px; margin: 0 0 16px;">Hi ${data.employee_name},</p>
      <p style="font-size: 14px; margin: 0 0 16px;">Please be informed of the upcoming public holidays. The office will be closed on these days:</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        ${holidayRows}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Plan your work and leave requests accordingly. If you have any questions, contact your manager or HR.</p>
    ${footer}`;
  }

  if (type === "password_reset") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #d97706;">Password Reset</h2>
      <p style="font-size: 14px; margin: 0 0 16px;">Hi ${data.employee_name},</p>
      <p style="font-size: 14px; margin: 0 0 16px;">Your password has been reset by an administrator. You will be prompted to set a new password on your next login.</p>
      <p style="font-size: 13px; color: #64748b; margin: 16px 0 0;">Log in at <a href="https://hr.bihlabs.com" style="color: #1a365d; font-weight: 600;">hr.bihlabs.com</a></p>
    ${footer}`;
  }

  if (type === "staff_on_leave") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #1a365d;">${data.employee_name} is on leave</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Please be informed that <strong>${data.employee_name}</strong>${data.department ? ` (${data.department})` : ""} is now on ${data.leave_type} leave.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Expected back</td><td style="padding: 8px 0; font-weight: 600;">${data.end_date}</td></tr>
        ${data.handover_name ? `<tr><td style="padding: 8px 0; color: #64748b;">Handover to</td><td style="padding: 8px 0;">${data.handover_name}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please direct any urgent matters to ${data.handover_name ? data.handover_name : "their manager"}.</p>
    ${footer}`;
  }

  if (type === "staff_returned") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #059669;">${data.employee_name} is back</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;"><strong>${data.employee_name}</strong> has completed their ${data.leave_type} leave and is back at work today.</p>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please resume handing over any pending matters to them.</p>
    ${footer}`;
  }

  if (type === "staff_going_on_leave") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #1a365d;">${data.employee_name} is going on leave</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Please be informed that <strong>${data.employee_name}</strong>${data.department ? ` (${data.department})` : ""} is scheduled to go on ${data.leave_type} leave in a few days.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Starts</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Expected back</td><td style="padding: 8px 0; font-weight: 600;">${data.end_date}</td></tr>
        ${data.handover_name ? `<tr><td style="padding: 8px 0; color: #64748b;">Handover to</td><td style="padding: 8px 0;">${data.handover_name}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please plan accordingly and direct any urgent matters to ${data.handover_name ? data.handover_name : "their manager"}.</p>
    ${footer}`;
  }

  if (type === "announcement") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #1a365d;">${escapeHtml(data.title)}</h2>
      ${greeting(data)}
      <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(data.body)}</div>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">&mdash; ${escapeHtml(data.sender_name || "BlueSPACE HR")}</p>
    ${footer}`;
  }

  return null;
}

export function buildSubject(type: string, data: EmailData): string {
  if (type === "leave_submitted") return `New Leave Request - ${data.employee_name}`;
  if (type === "leave_approved") return `Leave Approved - ${data.leave_type}`;
  if (type === "leave_rejected") return `Leave Rejected - ${data.leave_type}`;
  if (type === "employee_created") return `Welcome to BlueSPACE HR - ${data.employee_name}`;
  if (type === "leave_cancelled") return `Leave Cancelled - ${data.employee_name}`;
  if (type === "holiday_reminder") return `Upcoming Public Holidays`;
  if (type === "password_reset") return `Password Reset - ${data.employee_name}`;
  if (type === "leave_extended") return `Leave Extended - ${data.leave_type}`;
  if (type === "staff_on_leave") return `${data.employee_name} is on leave (${data.start_date} - ${data.end_date})`;
  if (type === "staff_returned") return `${data.employee_name} is back from leave`;
  if (type === "staff_going_on_leave") return `${data.employee_name} is going on leave (${data.start_date})`;
  if (type === "announcement") return data.title || "Announcement";
  return "HR Notification";
}

export async function logEmail(
  supabase: SupabaseClient,
  to: string,
  subject: string,
  status: "sent" | "failed" | "skipped",
  errorMessage?: string | null
): Promise<void> {
  try {
    await supabase.from("email_logs").insert({
      to_email: to,
      subject,
      status,
      error_message: errorMessage || null,
    });
  } catch (logErr) {
    console.error("Failed to log email:", logErr);
  }
}

// Sends one email through Resend. Returns a status: sent | skipped | failed.
export type EmailSendStatus = "sent" | "skipped" | "failed";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ status: EmailSendStatus; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log(`[email] Skipped (no RESEND_API_KEY): to=${to} subject="${subject}"`);
    return { status: "skipped", error: "RESEND_API_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM") || FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: "failed", error: body?.message || JSON.stringify(body) };
    }
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: (err as Error).message };
  }
}

// High-level helper: build + send + log. Never throws.
export async function sendTemplatedEmail(
  supabase: SupabaseClient,
  type: string,
  to: string,
  data: EmailData
): Promise<boolean> {
  const html = buildEmail(type, data);
  if (!html) {
    console.error(`[email] Unknown email type: ${type}`);
    return false;
  }
  const subject = buildSubject(type, data);
  const { status, error } = await sendEmail({ to, subject, html });
  await logEmail(supabase, to, subject, status, error ?? null);
  return status === "sent";
}
